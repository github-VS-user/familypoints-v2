"use client"

import React from "react"

import type { ReactNode } from "react"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Star, Award, BookOpen, Home, Minus, Plus, RotateCcw, Wifi, WifiOff, Flame } from "lucide-react"

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
  member_id?: string
  date: string
  daily_points_awarded: boolean
  rules_broken: Record<string, boolean>
}

interface OfflineTransaction {
  id: string
  member_id: string
  points: number
  reason: string
  transaction_type: string
  timestamp: number
}

const DAILY_RULES = [
  { key: "organization", label: "Tidying up when an activity is finished" },
  { key: "bed", label: "Making the bed" },
  { key: "plate", label: "Bringing out plate after meals" },
  { key: "teeth", label: "Brushing teeth after breakfast and dinner" },
  { key: "shower", label: "Showering every other day and tidying bathrobe" },
  { key: "ipad", label: "Charging iPad and tidying folders" },
  { key: "pajamas", label: "Putting on pajamas" },
  { key: "laundry", label: "Putting dirty laundry in hamper or trash in the bin" },
  { key: "clothes", label: "Laying out clothes for next day" },
  { key: "bedtime", label: "Going to bed on time" },
  { key: "family&table_manners", label: "Good family & table manners" },
  { key: "parent", label: "Don't act like a parent" },
  { key: "interrupt", label: "Don't interrupt others" },
  { key: "repeat", label: "Don't make mom repeat things" },
] as const

const BONUS_ACTIVITIES = [
  { label: "Set the table", points: 5 },
  { label: "Hang out washing", points: 5 },
  { label: "Take out Emy", points: 15 },
  { label: "General Help", points: 5 },
  { label: "Take out garbage", points: 5 },
  { label: "Clean rabbit area", points: 15 },
  { label: "Order drawers/closets", points: 15 },
  { label: "General cleaning", points: 15 },
] as const

class ErrorBoundary extends React.Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[v0] Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="shadow-lg border-red-200">
            <CardContent className="text-center py-8">
              <p className="text-red-600">Something went wrong. Please refresh the page.</p>
            </CardContent>
          </Card>
        )
      )
    }

    return this.props.children
  }
}

const ProgressCard = React.memo(
  ({
    selectedMember,
    weeklyPoints,
    monthlyPoints,
    streakCount,
  }: {
    selectedMember: FamilyMember
    weeklyPoints: number
    monthlyPoints: number
    streakCount: number
  }) => {
    const progressPercentage = useMemo(() => Math.min((weeklyPoints / 75) * 100, 100), [weeklyPoints])
    const chfEarned = useMemo(() => Math.min(Math.floor(weeklyPoints / 15), 5), [weeklyPoints])

    return (
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <Award className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            <span>{selectedMember.name}'s Progress</span>
            {streakCount > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 ml-2">
                <Flame className="h-3 w-3 mr-1" aria-hidden="true" />
                <span>{streakCount} day streak</span>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs sm:text-sm font-medium">Weekly Progress</span>
              <span
                className="text-xs sm:text-sm text-muted-foreground"
                aria-label={`${weeklyPoints} out of 75 points`}
              >
                {weeklyPoints}/75 points
              </span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-2 sm:h-3"
              aria-label={`Weekly progress: ${Math.round(progressPercentage)}% complete`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-primary" aria-label={`${weeklyPoints} weekly points`}>
                {weeklyPoints}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Weekly</div>
            </div>
            <div className="p-2 sm:p-3 bg-cyan-50 rounded-lg">
              <div
                className="text-lg sm:text-2xl font-bold text-secondary"
                aria-label={`${monthlyPoints} monthly points`}
              >
                {monthlyPoints}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Monthly</div>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-accent" aria-label={`${chfEarned} CHF earned`}>
                CHF {chfEarned}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Earned</div>
            </div>
          </div>

          {weeklyPoints >= 75 && (
            <Badge variant="secondary" className="w-full justify-center bg-blue-100 text-blue-800 py-2" role="status">
              🎉 Maximum weekly points reached!
            </Badge>
          )}
        </CardContent>
      </Card>
    )
  },
)

ProgressCard.displayName = "ProgressCard"

const DailyRoutineCard = React.memo(
  ({
    selectedMember,
    todayProgress,
    loading,
    onAwardDailyPoints,
    onBreakRule,
    swipeDirection,
    onTouchStart,
    onTouchEnd,
  }: {
    selectedMember: FamilyMember
    todayProgress: DailyProgress | null
    loading: boolean
    onAwardDailyPoints: () => void
    onBreakRule: (ruleKey: string) => void
    swipeDirection: string
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent, action: () => void) => void
  }) => {
    return (
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <Home className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            Daily Routine
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Complete your daily tasks to earn 15 points</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <Button
            onClick={onAwardDailyPoints}
            disabled={todayProgress?.daily_points_awarded || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 min-h-[48px] touch-manipulation text-sm sm:text-base"
            size="lg"
            onTouchStart={onTouchStart}
            onTouchEnd={(e) => onTouchEnd(e, onAwardDailyPoints)}
            aria-label={todayProgress?.daily_points_awarded ? "Daily points already awarded" : "Award 15 daily points"}
          >
            {loading
              ? "Loading..."
              : todayProgress?.daily_points_awarded
                ? "Daily Points Awarded ✓"
                : "Award Daily Points (+15)"}
          </Button>

          <Separator />

          <div className="grid gap-2" role="list" aria-label="Daily rules checklist">
            {DAILY_RULES.map((rule) => (
              <div
                key={rule.key}
                className={`flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100 transition-transform ${
                  swipeDirection === "left" ? "transform -translate-x-2" : ""
                }`}
                onTouchStart={onTouchStart}
                onTouchEnd={(e) => onTouchEnd(e, () => onBreakRule(rule.key))}
                role="listitem"
              >
                <span className="text-xs sm:text-sm flex-1 pr-2">{rule.label}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onBreakRule(rule.key)}
                  disabled={!todayProgress?.daily_points_awarded || todayProgress?.rules_broken?.[rule.key]}
                  className="shrink-0 min-h-[36px] touch-manipulation"
                  aria-label={`${rule.label} - ${todayProgress?.rules_broken?.[rule.key] ? "Already broken" : "Deduct 1 point"}`}
                >
                  <Minus className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                  <span className="ml-1 text-xs sm:text-sm">
                    {todayProgress?.rules_broken?.[rule.key] ? "Broken" : "-1"}
                  </span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  },
)

DailyRoutineCard.displayName = "DailyRoutineCard"

export function FamilyPointsApp() {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [weeklyPoints, setWeeklyPoints] = useState(0)
  const [monthlyPoints, setMonthlyPoints] = useState(0)
  const [todayProgress, setTodayProgress] = useState<DailyProgress | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<PointsTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineQueue, setOfflineQueue] = useState<OfflineTransaction[]>([])
  const [streakCount, setStreakCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [supabaseClient, setSupabaseClient] = useState<any>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const [swipeDirection, setSwipeDirection] = useState<string>("")

  const withErrorHandling = useCallback(async (operation: () => Promise<void>, errorMessage: string) => {
    try {
      setError(null)
      await operation()
    } catch (error) {
      console.error(`[v0] ${errorMessage}:`, error)
      setError(errorMessage)
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent, action: () => void) => {
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY

    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        setSwipeDirection("right")
        action()
      } else {
        setSwipeDirection("left")
        action()
      }

      setTimeout(() => setSwipeDirection(""), 300)
    }
  }, [])

  useEffect(() => {
    try {
      console.log("[v0] Creating Supabase client...")
      const client = createClient()
      setSupabaseClient(client)
      console.log("[v0] Supabase client created successfully")
    } catch (error) {
      console.error("[v0] Failed to create Supabase client:", error)
      setClientError("Failed to connect to database. Please check your connection.")
    }
  }, [])

  const loadMembers = async () => {
    if (!supabaseClient) {
      console.log("[v0] Supabase client not ready yet")
      return
    }

    await withErrorHandling(async () => {
      const { data, error } = await supabaseClient.from("family_members").select("*").order("name")

      if (error) {
        throw error
      }

      setMembers(data || [])
      localStorage.setItem("familyPointsMembers", JSON.stringify(data || []))
    }, "Failed to load family members")
  }

  const loadMemberData = async (memberId: string) => {
    if (!supabaseClient) {
      console.log("[v0] Supabase client not ready for loadMemberData")
      return
    }

    setLoading(true)

    await withErrorHandling(async () => {
      const now = new Date()
      const startOfWeek = new Date(now)
      const dayOfWeek = startOfWeek.getDay()
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startOfWeek.setDate(startOfWeek.getDate() + daysToMonday)
      startOfWeek.setHours(0, 0, 0, 0)

      console.log("[v0] Loading weekly points from:", startOfWeek.toISOString())

      const { data: weeklyData } = await supabaseClient
        .from("points_transactions")
        .select("points")
        .eq("member_id", memberId)
        .gte("created_at", startOfWeek.toISOString())

      const weeklyTotal = weeklyData?.reduce((sum, t) => sum + t.points, 0) || 0
      console.log("[v0] Weekly points calculated:", weeklyTotal, "from", weeklyData?.length, "transactions")
      setWeeklyPoints(Math.max(0, weeklyTotal))

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthlyData } = await supabaseClient
        .from("points_transactions")
        .select("points")
        .eq("member_id", memberId)
        .gte("created_at", startOfMonth.toISOString())

      const monthlyTotal = monthlyData?.reduce((sum, t) => sum + t.points, 0) || 0
      setMonthlyPoints(Math.max(0, monthlyTotal))

      const today = new Date().toISOString().split("T")[0]
      const { data: progressData } = await supabaseClient
        .from("daily_progress")
        .select("*")
        .eq("member_id", memberId)
        .eq("date", today)
        .single()

      setTodayProgress(progressData)

      const { data: transactionsData } = await supabaseClient
        .from("points_transactions")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false })
        .limit(10)

      setRecentTransactions(transactionsData || [])

      localStorage.setItem(
        "familyPointsData",
        JSON.stringify({
          memberId,
          weeklyPoints: weeklyTotal,
          monthlyPoints: monthlyTotal,
          todayProgress: progressData,
          recentTransactions: transactionsData || [],
        }),
      )
    }, "Failed to load member data")

    setLoading(false)
  }

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return

    console.log("[v0] Syncing offline queue:", offlineQueue.length, "transactions")

    for (const transaction of offlineQueue) {
      try {
        const { error } = await supabaseClient.from("points_transactions").insert({
          member_id: transaction.member_id,
          points: transaction.points,
          reason: transaction.reason,
          transaction_type: transaction.transaction_type,
        })

        if (error) {
          console.error("[v0] Error syncing transaction:", error)
          return
        }
      } catch (error) {
        console.error("[v0] Network error syncing transaction:", error)
        return
      }
    }

    setOfflineQueue([])
    localStorage.removeItem("familyPointsOfflineQueue")

    if (selectedMember) {
      loadMemberData(selectedMember.id)
    }
  }

  const calculateStreak = async (memberId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from("daily_progress")
        .select("date, daily_points_awarded")
        .eq("member_id", memberId)
        .eq("daily_points_awarded", true)
        .order("date", { ascending: false })
        .limit(30)

      if (error || !data) {
        setStreakCount(0)
        return
      }

      let streak = 0
      const today = new Date()

      for (let i = 0; i < data.length; i++) {
        const progressDate = new Date(data[i].date)
        const expectedDate = new Date(today)
        expectedDate.setDate(today.getDate() - i)

        if (progressDate.toDateString() === expectedDate.toDateString()) {
          streak++
        } else {
          break
        }
      }

      setStreakCount(streak)
    } catch (error) {
      console.error("[v0] Error calculating streak:", error)
      setStreakCount(0)
    }
  }

  const addTransactionOfflineSupport = async (transaction: Omit<OfflineTransaction, "id" | "timestamp">) => {
    if (!isOnline) {
      const offlineTransaction: OfflineTransaction = {
        ...transaction,
        id: Date.now().toString(),
        timestamp: Date.now(),
      }

      const newQueue = [...offlineQueue, offlineTransaction]
      setOfflineQueue(newQueue)
      localStorage.setItem("familyPointsOfflineQueue", JSON.stringify(newQueue))

      setWeeklyPoints((prev) => Math.max(0, prev + transaction.points))
      setMonthlyPoints((prev) => Math.max(0, prev + transaction.points))

      return true
    }

    try {
      const { error } = await supabaseClient.from("points_transactions").insert({
        member_id: transaction.member_id,
        points: transaction.points,
        reason: transaction.reason,
        transaction_type: transaction.transaction_type,
      })

      if (error) {
        console.error("[v0] Error adding transaction:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("[v0] Network error adding transaction:", error)
      return false
    }
  }

  const awardDailyPoints = async () => {
    if (!selectedMember || todayProgress?.daily_points_awarded) return

    const today = new Date().toISOString().split("T")[0]

    console.log("[v0] Awarding daily points for member:", selectedMember.name)

    const success = await addTransactionOfflineSupport({
      member_id: selectedMember.id,
      points: 15,
      reason: "Daily routine completed",
      transaction_type: "daily_award",
    })

    if (!success && isOnline) return

    if (isOnline) {
      const { error: progressError } = await supabaseClient.from("daily_progress").upsert({
        member_id: selectedMember.id,
        date: today,
        daily_points_awarded: true,
        rules_broken: {},
      })

      if (progressError) {
        console.error("[v0] Error updating daily progress:", progressError)
        return
      }
    } else {
      setTodayProgress({
        id: "offline",
        member_id: selectedMember.id,
        date: today,
        daily_points_awarded: true,
        rules_broken: {},
      })
    }

    if (isOnline) {
      await loadMemberData(selectedMember.id)
    }
    console.log("[v0] Daily points awarded, data reloaded")
  }

  const breakRule = async (ruleKey: string) => {
    if (!selectedMember || !todayProgress?.daily_points_awarded) return

    const today = new Date().toISOString().split("T")[0]
    const newRulesBroken = { ...todayProgress.rules_broken, [ruleKey]: true }

    const success = await addTransactionOfflineSupport({
      member_id: selectedMember.id,
      points: -1,
      reason: `Rule broken: ${DAILY_RULES.find((r) => r.key === ruleKey)?.label}`,
      transaction_type: "rule_broken",
    })

    if (!success && isOnline) return

    if (isOnline) {
      await supabaseClient.from("daily_progress").upsert({
        member_id: selectedMember.id,
        date: today,
        daily_points_awarded: todayProgress.daily_points_awarded,
        rules_broken: newRulesBroken,
      })
    } else {
      setTodayProgress({
        ...todayProgress,
        rules_broken: newRulesBroken,
      })
    }

    if (isOnline) {
      loadMemberData(selectedMember.id)
    }
  }

  const addBonusPoints = async (activity: string, points: number) => {
    if (!selectedMember) return

    const success = await addTransactionOfflineSupport({
      member_id: selectedMember.id,
      points,
      reason: activity,
      transaction_type: "bonus_activity",
    })

    if (success && isOnline) {
      loadMemberData(selectedMember.id)
    }
  }

  const addSchoolReward = async (points: number, reason: string) => {
    if (!selectedMember) return

    const success = await addTransactionOfflineSupport({
      member_id: selectedMember.id,
      points,
      reason,
      transaction_type: points > 0 ? "school_reward" : "school_penalty",
    })

    if (success && isOnline) {
      loadMemberData(selectedMember.id)
    }
  }

  const resetMemberPoints = async () => {
    if (!selectedMember) return

    const confirmReset = window.confirm(
      `Are you sure you want to reset ALL points and progress for ${selectedMember.name}? This cannot be undone.`,
    )

    if (!confirmReset) return

    setLoading(true)

    try {
      await supabaseClient.from("points_transactions").delete().eq("member_id", selectedMember.id)
      await supabaseClient.from("daily_progress").delete().eq("member_id", selectedMember.id)
      await loadMemberData(selectedMember.id)

      console.log("[v0] Successfully reset all data for", selectedMember.name)
    } catch (error) {
      console.error("[v0] Error resetting member data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (supabaseClient) {
      loadMembers()
    }
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    const savedQueue = localStorage.getItem("familyPointsOfflineQueue")
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue))
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [supabaseClient])

  useEffect(() => {
    if (selectedMember && supabaseClient) {
      loadMemberData(selectedMember.id)
      calculateStreak(selectedMember.id)
    }
  }, [selectedMember, supabaseClient])

  if (clientError) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-4">
          <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
            <Card className="shadow-lg border-red-200">
              <CardContent className="text-center py-8">
                <p className="text-red-600 mb-4">{clientError}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  if (!supabaseClient) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-4">
          <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
            <Card className="shadow-lg border-blue-200">
              <CardContent className="text-center py-8">
                <p className="text-blue-600">Connecting to database...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-2 sm:py-4">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <div className="text-center flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
                <Star className="h-5 w-5 sm:h-8 sm:w-8" aria-hidden="true" />
                Family Points
              </h1>
              <p className="text-muted-foreground text-xs sm:text-base">Track daily routines and earn rewards!</p>
            </div>
            <div
              className="flex items-center gap-2"
              role="status"
              aria-label={`Connection status: ${isOnline ? "online" : "offline"}`}
            >
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" aria-label="Online" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" aria-label="Offline" />
              )}
              {offlineQueue.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs"
                  aria-label={`${offlineQueue.length} transactions pending sync`}
                >
                  {offlineQueue.length} pending
                </Badge>
              )}
            </div>
          </div>

          {error && (
            <Card className="shadow-lg border-red-200 mb-4">
              <CardContent className="text-center py-4">
                <p className="text-red-600 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2 sm:gap-4 mb-4 sm:mb-8" role="group" aria-label="Family member selection">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-center"
              >
                <Button
                  variant={selectedMember?.id === member.id ? "default" : "outline"}
                  size="lg"
                  onClick={() => setSelectedMember(member)}
                  className="text-sm sm:text-lg px-4 sm:px-8 py-3 sm:py-4 min-h-[48px] touch-manipulation"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, () => setSelectedMember(member))}
                  aria-pressed={selectedMember?.id === member.id}
                  aria-label={`Select ${member.name}`}
                >
                  {member.name}
                </Button>
                {selectedMember?.id === member.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetMemberPoints}
                    disabled={loading}
                    className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent min-h-[40px] touch-manipulation"
                    aria-label={`Reset all points for ${member.name}`}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
                    Reset
                  </Button>
                )}
              </div>
            ))}
          </div>

          {selectedMember && (
            <div className="space-y-3 sm:space-y-6">
              <ProgressCard
                selectedMember={selectedMember}
                weeklyPoints={weeklyPoints}
                monthlyPoints={monthlyPoints}
                streakCount={streakCount}
              />

              <DailyRoutineCard
                selectedMember={selectedMember}
                todayProgress={todayProgress}
                loading={loading}
                onAwardDailyPoints={awardDailyPoints}
                onBreakRule={breakRule}
                swipeDirection={swipeDirection}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />

              <Card className="shadow-lg border-blue-200">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    Bonus Activities
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Earn extra points for helping around the house
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2" role="list" aria-label="Bonus activities">
                    {BONUS_ACTIVITIES.map((activity, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => addBonusPoints(activity.label, activity.points)}
                        className={`justify-between p-3 sm:p-4 h-auto border-blue-200 hover:bg-blue-50 min-h-[48px] touch-manipulation transition-transform ${
                          swipeDirection === "right" ? "transform translate-x-2" : ""
                        }`}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => handleTouchEnd(e, () => addBonusPoints(activity.label, activity.points))}
                        role="listitem"
                        aria-label={`${activity.label} - earn ${activity.points} points`}
                      >
                        <span className="text-left flex-1 text-xs sm:text-sm">{activity.label}</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-2 text-xs">
                          +{activity.points}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-blue-200">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    School Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => addSchoolReward(75, "Monthly average ≥ 5")}
                    className="w-full justify-between p-3 sm:p-4 h-auto border-blue-200 hover:bg-blue-50 min-h-[48px] touch-manipulation"
                    aria-label="Monthly average greater than or equal to 5 - earn 75 points"
                  >
                    <span className="text-xs sm:text-sm">Monthly average ≥ 5</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      +75
                    </Badge>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addSchoolReward(150, "All subjects ≥ 5")}
                    className="w-full justify-between p-3 sm:p-4 h-auto border-blue-200 hover:bg-blue-50 min-h-[48px] touch-manipulation"
                    aria-label="All subjects greater than or equal to 5 - earn 150 points"
                  >
                    <span className="text-xs sm:text-sm">All subjects ≥ 5</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      +150
                    </Badge>
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => addSchoolReward(-75, "Grade below minimum")}
                    className="w-full justify-between p-3 sm:p-4 h-auto min-h-[48px] touch-manipulation"
                    aria-label="Grade below minimum - lose 75 points"
                  >
                    <span className="text-xs sm:text-sm">Grade below minimum</span>
                    <Badge variant="destructive" className="text-xs">
                      -75
                    </Badge>
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-blue-200">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-xl">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2" role="list" aria-label="Recent point transactions">
                    {recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-blue-50/50 border border-blue-100"
                        role="listitem"
                      >
                        <div className="flex-1">
                          <div className="text-xs sm:text-sm font-medium">{transaction.reason}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge
                          variant={transaction.points > 0 ? "secondary" : "destructive"}
                          className={`text-xs ${transaction.points > 0 ? "bg-blue-100 text-blue-800" : ""}`}
                          aria-label={`${transaction.points > 0 ? "Gained" : "Lost"} ${Math.abs(transaction.points)} points`}
                        >
                          {transaction.points > 0 ? "+" : ""}
                          {transaction.points}
                        </Badge>
                      </div>
                    ))}
                    {recentTransactions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 text-xs sm:text-sm">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!selectedMember && (
            <Card className="shadow-lg border-blue-200">
              <CardContent className="text-center py-8 sm:py-12">
                <Star className="h-12 w-12 text-blue-300 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold mb-2">Select a Family Member</h3>
                <p className="text-muted-foreground">Choose Dario or Linda to start tracking points!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
