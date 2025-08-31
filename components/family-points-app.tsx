"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Star, Award, BookOpen, Home, Minus, Plus, RotateCcw } from "lucide-react"

interface FamilyMember {
  id: string
  name: string
}

interface PointsTransaction {
  id: string
  points: number
  reason: string
  transaction_type: string
  created_at: string
}

interface DailyProgress {
  id: string
  date: string
  daily_points_awarded: boolean
  rules_broken: Record<string, boolean>
}

const DAILY_RULES = [
  { key: "dressed", label: "Getting dressed in the morning" },
  { key: "bed", label: "Making the bed" },
  { key: "plate", label: "Bringing out plate after meals" },
  { key: "teeth", label: "Brushing teeth after breakfast and dinner" },
  { key: "shower", label: "Showering every other day and tidying bathrobe" },
  { key: "ipad", label: "Charging iPad and tidying folders" },
  { key: "pajamas", label: "Putting on pajamas" },
  { key: "laundry", label: "Putting dirty laundry in hamper" },
  { key: "clothes", label: "Laying out clothes for next day" },
  { key: "bedtime", label: "Going to bed on time" },
  { key: "table_manners", label: "Good table manners" },
  { key: "parent", label: "Don't act like a parent" },
  { key: "interrupt", label: "Don't interrupt others" },
  { key: "repeat", label: "Don't make mom repeat things" },
]

const BONUS_ACTIVITIES = [
  { label: "Set the table", points: 5 },
  { label: "Hang out washing", points: 5 },
  { label: "Take out Emy", points: 15 },
  { label: "Take out garbage", points: 5 },
  { label: "Clean rabbit area", points: 15 },
  { label: "Order drawers/closets", points: 15 },
  { label: "General cleaning", points: 15 },
]

export function FamilyPointsApp() {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [weeklyPoints, setWeeklyPoints] = useState(0)
  const [monthlyPoints, setMonthlyPoints] = useState(0)
  const [todayProgress, setTodayProgress] = useState<DailyProgress | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<PointsTransaction[]>([])
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    if (selectedMember) {
      loadMemberData(selectedMember.id)
    }
  }, [selectedMember])

  const loadMembers = async () => {
    const { data, error } = await supabase.from("family_members").select("*").order("name")

    if (error) {
      console.error("Error loading members:", error)
      return
    }

    setMembers(data || [])
  }

  const loadMemberData = async (memberId: string) => {
    setLoading(true)

    const now = new Date()
    const startOfWeek = new Date(now)
    // Set to Monday of current week (0 = Sunday, 1 = Monday)
    const dayOfWeek = startOfWeek.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(startOfWeek.getDate() + daysToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    console.log("[v0] Loading weekly points from:", startOfWeek.toISOString())

    const { data: weeklyData } = await supabase
      .from("points_transactions")
      .select("points")
      .eq("member_id", memberId)
      .gte("created_at", startOfWeek.toISOString())

    const weeklyTotal = weeklyData?.reduce((sum, t) => sum + t.points, 0) || 0
    console.log("[v0] Weekly points calculated:", weeklyTotal, "from", weeklyData?.length, "transactions")
    setWeeklyPoints(Math.max(0, weeklyTotal))

    // Get current month's points
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyData } = await supabase
      .from("points_transactions")
      .select("points")
      .eq("member_id", memberId)
      .gte("created_at", startOfMonth.toISOString())

    const monthlyTotal = monthlyData?.reduce((sum, t) => sum + t.points, 0) || 0
    setMonthlyPoints(Math.max(0, monthlyTotal))

    // Get today's progress
    const today = new Date().toISOString().split("T")[0]
    const { data: progressData } = await supabase
      .from("daily_progress")
      .select("*")
      .eq("member_id", memberId)
      .eq("date", today)
      .single()

    setTodayProgress(progressData)

    // Get recent transactions
    const { data: transactionsData } = await supabase
      .from("points_transactions")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(10)

    setRecentTransactions(transactionsData || [])

    setLoading(false)
  }

  const awardDailyPoints = async () => {
    if (!selectedMember || todayProgress?.daily_points_awarded) return

    const today = new Date().toISOString().split("T")[0]

    console.log("[v0] Awarding daily points for member:", selectedMember.name)

    const { error } = await supabase.from("points_transactions").insert({
      member_id: selectedMember.id,
      points: 15,
      reason: "Daily routine completed",
      transaction_type: "daily_award",
    })

    if (error) {
      console.error("[v0] Error adding daily points:", error)
      return
    }

    // Update or create daily progress
    const { error: progressError } = await supabase.from("daily_progress").upsert({
      member_id: selectedMember.id,
      date: today,
      daily_points_awarded: true,
      rules_broken: {},
    })

    if (progressError) {
      console.error("[v0] Error updating daily progress:", progressError)
      return
    }

    await loadMemberData(selectedMember.id)
    console.log("[v0] Daily points awarded, data reloaded")
  }

  const breakRule = async (ruleKey: string) => {
    if (!selectedMember || !todayProgress?.daily_points_awarded) return

    const today = new Date().toISOString().split("T")[0]
    const newRulesBroken = { ...todayProgress.rules_broken, [ruleKey]: true }

    // Deduct point
    await supabase.from("points_transactions").insert({
      member_id: selectedMember.id,
      points: -1,
      reason: `Rule broken: ${DAILY_RULES.find((r) => r.key === ruleKey)?.label}`,
      transaction_type: "rule_broken",
    })

    // Update daily progress
    await supabase.from("daily_progress").upsert({
      member_id: selectedMember.id,
      date: today,
      daily_points_awarded: todayProgress.daily_points_awarded,
      rules_broken: newRulesBroken,
    })

    loadMemberData(selectedMember.id)
  }

  const addBonusPoints = async (activity: string, points: number) => {
    if (!selectedMember) return

    await supabase.from("points_transactions").insert({
      member_id: selectedMember.id,
      points,
      reason: activity,
      transaction_type: "bonus_activity",
    })

    loadMemberData(selectedMember.id)
  }

  const addSchoolReward = async (points: number, reason: string) => {
    if (!selectedMember) return

    await supabase.from("points_transactions").insert({
      member_id: selectedMember.id,
      points,
      reason,
      transaction_type: points > 0 ? "school_reward" : "school_penalty",
    })

    loadMemberData(selectedMember.id)
  }

  const resetMemberPoints = async () => {
    if (!selectedMember) return

    const confirmReset = window.confirm(
      `Are you sure you want to reset ALL points and progress for ${selectedMember.name}? This cannot be undone.`,
    )

    if (!confirmReset) return

    setLoading(true)

    try {
      // Delete all points transactions
      await supabase.from("points_transactions").delete().eq("member_id", selectedMember.id)

      // Delete all daily progress
      await supabase.from("daily_progress").delete().eq("member_id", selectedMember.id)

      // Reload member data
      await loadMemberData(selectedMember.id)

      console.log("[v0] Successfully reset all data for", selectedMember.name)
    } catch (error) {
      console.error("[v0] Error resetting member data:", error)
    } finally {
      setLoading(false)
    }
  }

  const progressPercentage = Math.min((weeklyPoints / 75) * 100, 100)
  const chfEarned = Math.min(Math.floor(weeklyPoints / 15), 5) // Max 5 CHF, 1 CHF per 15 points

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
            <Star className="h-6 w-6 sm:h-8 sm:w-8" />
            Family Points
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track daily routines and earn rewards!</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
          {members.map((member) => (
            <div key={member.id} className="flex flex-col sm:flex-row gap-2 items-center">
              <Button
                variant={selectedMember?.id === member.id ? "default" : "outline"}
                size="lg"
                onClick={() => setSelectedMember(member)}
                className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
              >
                {member.name}
              </Button>
              {selectedMember?.id === member.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetMemberPoints}
                  disabled={loading}
                  className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto bg-transparent"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          ))}
        </div>

        {selectedMember && (
          <div className="space-y-4 sm:space-y-6">
            {/* Progress Overview */}
            <Card className="shadow-lg border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Award className="h-5 w-5" />
                  {selectedMember.name}'s Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Weekly Progress</span>
                    <span className="text-sm text-muted-foreground">{weeklyPoints}/75 points</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                  <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{weeklyPoints}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Weekly</div>
                  </div>
                  <div className="p-2 sm:p-3 bg-cyan-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-secondary">{monthlyPoints}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Monthly</div>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-accent">CHF {chfEarned}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Earned</div>
                  </div>
                </div>

                {weeklyPoints >= 75 && (
                  <Badge variant="secondary" className="w-full justify-center bg-blue-100 text-blue-800">
                    🎉 Maximum weekly points reached!
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Daily Routine */}
            <Card className="shadow-lg border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Home className="h-5 w-5" />
                  Daily Routine
                </CardTitle>
                <CardDescription className="text-sm">Complete your daily tasks to earn 15 points</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={awardDailyPoints}
                  disabled={todayProgress?.daily_points_awarded || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {todayProgress?.daily_points_awarded ? "Daily Points Awarded ✓" : "Award Daily Points (+15)"}
                </Button>

                <Separator />

                <div className="grid gap-2">
                  {DAILY_RULES.map((rule) => (
                    <div
                      key={rule.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100"
                    >
                      <span className="text-sm flex-1 pr-2">{rule.label}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => breakRule(rule.key)}
                        disabled={!todayProgress?.daily_points_awarded || todayProgress?.rules_broken?.[rule.key]}
                        className="shrink-0"
                      >
                        <Minus className="h-4 w-4" />
                        <span className="ml-1">{todayProgress?.rules_broken?.[rule.key] ? "Broken" : "-1"}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bonus Activities */}
            <Card className="shadow-lg border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Plus className="h-5 w-5" />
                  Bonus Activities
                </CardTitle>
                <CardDescription className="text-sm">Earn extra points for helping around the house</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {BONUS_ACTIVITIES.map((activity, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => addBonusPoints(activity.label, activity.points)}
                      className="justify-between p-4 h-auto border-blue-200 hover:bg-blue-50"
                    >
                      <span className="text-left flex-1">{activity.label}</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-2">
                        +{activity.points}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* School Performance */}
            <Card className="shadow-lg border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <BookOpen className="h-5 w-5" />
                  School Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => addSchoolReward(75, "Monthly average ≥ 5")}
                  className="w-full justify-between p-4 h-auto border-blue-200 hover:bg-blue-50"
                >
                  <span>Monthly average ≥ 5</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    +75
                  </Badge>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => addSchoolReward(150, "All subjects ≥ 5")}
                  className="w-full justify-between p-4 h-auto border-blue-200 hover:bg-blue-50"
                >
                  <span>All subjects ≥ 5</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    +150
                  </Badge>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => addSchoolReward(-75, "Grade below minimum")}
                  className="w-full justify-between p-4 h-auto"
                >
                  <span>Grade below minimum</span>
                  <Badge variant="destructive">-75</Badge>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-lg border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 border border-blue-100"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{transaction.reason}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant={transaction.points > 0 ? "secondary" : "destructive"}
                        className={transaction.points > 0 ? "bg-blue-100 text-blue-800" : ""}
                      >
                        {transaction.points > 0 ? "+" : ""}
                        {transaction.points}
                      </Badge>
                    </div>
                  ))}
                  {recentTransactions.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedMember && (
          <Card className="shadow-lg border-blue-200">
            <CardContent className="text-center py-8 sm:py-12">
              <Star className="h-12 w-12 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Family Member</h3>
              <p className="text-muted-foreground">Choose Dario or Linda to start tracking points!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
