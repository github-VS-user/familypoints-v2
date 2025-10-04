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
import {
  Star,
  Award,
  BookOpen,
  Home,
  Minus,
  Plus,
  RotateCcw,
  Wifi,
  WifiOff,
  Flame,
  Undo2,
  Languages,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { translate, type Language } from "@/lib/translations"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import Image from "next/image"

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

interface LastAction {
  type: "transaction" | "daily_award" | "rule_broken"
  transactionId?: string
  memberId: string
  points: number
  reason: string
  progressData?: DailyProgress
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
  { key: "family_manners", label: "Good family manners" },
  { key: "bedtime", label: "Going to bed on time" },
  { key: "table_manners", label: "Good table manners" },
  { key: "parent", label: "Don't act like a parent" },
  { key: "interrupt", label: "Don't interrupt others" },
  { key: "repeat", label: "Don't make mom repeat things" },
] as const

const BONUS_ACTIVITIES = [
  { key: "setTable", label: "Set the table", points: 5 },
  { key: "hangWashing", label: "Hang out washing", points: 5 },
  { key: "takeOutEmy", label: "Take out Emy", points: 15 },
  { key: "generalHelp", label: "General Help", points: 5 },
  { key: "takeOutGarbage", label: "Take out garbage", points: 5 },
  { key: "cleanRabbit", label: "Clean rabbit area", points: 15 },
  { key: "orderDrawers", label: "Order drawers/closets", points: 15 },
  { key: "generalCleaning", label: "General cleaning", points: 15 },
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
    lang,
  }: {
    selectedMember: FamilyMember
    weeklyPoints: number
    monthlyPoints: number
    streakCount: number
    lang: Language
  }) => {
    const progressPercentage = useMemo(() => Math.min((weeklyPoints / 75) * 100, 100), [weeklyPoints])
    const chfEarned = useMemo(() => Math.min(Math.floor(weeklyPoints / 15), 5), [weeklyPoints])

    return (
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <Award className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            <span>
              {selectedMember.name}'s {translate("progress", lang)}
            </span>
            {streakCount > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 ml-2">
                <Flame className="h-3 w-3 mr-1" aria-hidden="true" />
                <span>
                  {streakCount} {translate("dayStreak", lang)}
                </span>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs sm:text-sm font-medium">{translate("weeklyProgress", lang)}</span>
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
              <div className="text-xs sm:text-sm text-muted-foreground">{translate("weekly", lang)}</div>
            </div>
            <div className="p-2 sm:p-3 bg-cyan-50 rounded-lg">
              <div
                className="text-lg sm:text-2xl font-bold text-secondary"
                aria-label={`${monthlyPoints} monthly points`}
              >
                {monthlyPoints}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">{translate("monthly", lang)}</div>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-accent" aria-label={`${chfEarned} CHF earned`}>
                CHF {chfEarned}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">{translate("earned", lang)}</div>
            </div>
          </div>

          {weeklyPoints >= 75 && (
            <Badge variant="secondary" className="w-full justify-center bg-blue-100 text-blue-800 py-2" role="status">
              🎉 {translate("maxReached", lang)}
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
    lang,
  }: {
    selectedMember: FamilyMember
    todayProgress: DailyProgress | null
    loading: boolean
    onAwardDailyPoints: () => void
    onBreakRule: (ruleKey: string) => void
    swipeDirection: string
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent, action: () => void) => void
    lang: Language
  }) => {
    return (
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <Home className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            {translate("dailyRoutine", lang)}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{translate("dailyRoutineDesc", lang)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <Button
            onClick={onAwardDailyPoints}
            disabled={todayProgress?.daily_points_awarded || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 min-h-[48px] touch-manipulation text-sm sm:text-base"
            size="lg"
            onTouchStart={onTouchStart}
            onTouchEnd={(e) => onTouchEnd(e, onAwardDailyPoints)}
            aria-label={
              todayProgress?.daily_points_awarded
                ? translate("dailyPointsAwarded", lang)
                : translate("awardDailyPoints", lang)
            }
          >
            {loading
              ? translate("loading", lang)
              : todayProgress?.daily_points_awarded
                ? translate("dailyPointsAwarded", lang)
                : translate("awardDailyPoints", lang)}
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
                <span className="text-xs sm:text-sm flex-1 pr-2">{translate(`rules.${rule.key}`, lang)}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onBreakRule(rule.key)}
                  disabled={!todayProgress?.daily_points_awarded || todayProgress?.rules_broken?.[rule.key]}
                  className="shrink-0 min-h-[36px] touch-manipulation"
                  aria-label={`${translate(`rules.${rule.key}`, lang)} - ${todayProgress?.rules_broken?.[rule.key] ? translate("rules.broken", lang) : "-1"}`}
                >
                  <Minus className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                  <span className="ml-1 text-xs sm:text-sm">
                    {todayProgress?.rules_broken?.[rule.key] ? translate("rules.broken", lang) : "-1"}
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
  const router = useRouter()
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
  const [language, setLanguage] = useState<Language>("en")
  const [lastAction, setLastAction] = useState<LastAction | null>(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const { toast } = useToast()

  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const [swipeDirection, setSwipeDirection] = useState<string>("")

  useEffect(() => {
    const savedLang = localStorage.getItem("familyPointsLanguage") as Language
    if (savedLang && ["en", "fr", "it"].includes(savedLang)) {
      setLanguage(savedLang)
    }
  }, [])

  const toggleLanguage = useCallback(() => {
    const languages: Language[] = ["en", "fr", "it"]
    const currentIndex = languages.indexOf(language)
    const nextLanguage = languages[(currentIndex + 1) % languages.length]
    setLanguage(nextLanguage)
    localStorage.setItem("familyPointsLanguage", nextLanguage)
    toast({
      title: translate("title", nextLanguage),
      description: `Language changed to ${nextLanguage.toUpperCase()}`,
    })
  }, [language, toast])

  const undoLastAction = useCallback(async () => {
    if (!lastAction || !supabaseClient) {
      toast({
        title: translate("cannotUndo", language),
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      if (lastAction.type === "transaction" && lastAction.transactionId) {
        // Delete the transaction
        const { error } = await supabaseClient.from("points_transactions").delete().eq("id", lastAction.transactionId)

        if (error) throw error
      } else if (lastAction.type === "daily_award" && lastAction.progressData) {
        // Revert daily progress
        const { error: progressError } = await supabaseClient
          .from("daily_progress")
          .delete()
          .eq("member_id", lastAction.memberId)
          .eq("date", lastAction.progressData.date)

        if (progressError) throw progressError

        // Delete the transaction
        const { error: transactionError } = await supabaseClient
          .from("points_transactions")
          .delete()
          .eq("member_id", lastAction.memberId)
          .eq("reason", "Daily routine completed")
          .gte("created_at", lastAction.progressData.date)

        if (transactionError) throw transactionError
      } else if (lastAction.type === "rule_broken" && lastAction.progressData) {
        // Restore the progress state
        const { error } = await supabaseClient
          .from("daily_progress")
          .update({ rules_broken: lastAction.progressData.rules_broken })
          .eq("member_id", lastAction.memberId)
          .eq("date", lastAction.progressData.date)

        if (error) throw error
      }

      setLastAction(null)

      if (selectedMember) {
        await loadMemberData(selectedMember.id)
      }

      toast({
        title: translate("actionUndone", language),
        description: `${lastAction.points > 0 ? "+" : ""}${lastAction.points} points`,
      })
    } catch (error) {
      console.error("[v0] Error undoing action:", error)
      toast({
        title: translate("cannotUndo", language),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [lastAction, supabaseClient, selectedMember, language, toast])

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
        .limit(15)

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
      const { data, error } = await supabaseClient
        .from("points_transactions")
        .insert({
          member_id: transaction.member_id,
          points: transaction.points,
          reason: transaction.reason,
          transaction_type: transaction.transaction_type,
        })
        .select("id")
        .single()

      if (error) {
        console.error("[v0] Error adding transaction:", error)
        return false
      }

      if (
        transaction.transaction_type === "bonus_activity" ||
        transaction.transaction_type === "school_reward" ||
        transaction.transaction_type === "school_penalty"
      ) {
        setLastAction({
          type: "transaction",
          transactionId: data?.id,
          memberId: transaction.member_id,
          points: transaction.points,
          reason: transaction.reason,
        })
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

      setLastAction({
        type: "daily_award",
        memberId: selectedMember.id,
        points: 15,
        reason: "Daily routine completed",
        progressData: {
          id: "temp",
          member_id: selectedMember.id,
          date: today,
          daily_points_awarded: false,
          rules_broken: {},
        },
      })
    } else {
      setTodayProgress({
        id: "offline",
        member_id: selectedMember.id,
        date: today,
        daily_points_awarded: true,
        rules_broken: {},
      })
    }

    toast({
      title: translate("dailyPointsAwarded", language),
      description: `+15 ${translate("pointsAdded", language, { points: "15" })}`,
    })

    if (isOnline) {
      await loadMemberData(selectedMember.id)
    }
    console.log("[v0] Daily points awarded, data reloaded")
  }

  const breakRule = async (ruleKey: string) => {
    if (!selectedMember || !todayProgress?.daily_points_awarded) return

    const today = new Date().toISOString().split("T")[0]
    const previousRulesBroken = { ...todayProgress.rules_broken }
    const newRulesBroken = { ...todayProgress.rules_broken, [ruleKey]: true }

    const success = await addTransactionOfflineSupport({
      member_id: selectedMember.id,
      points: -1,
      reason: `Rule broken: ${translate(`rules.${ruleKey}`, language)}`,
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

      setLastAction({
        type: "rule_broken",
        memberId: selectedMember.id,
        points: -1,
        reason: `Rule broken: ${ruleKey}`,
        progressData: {
          ...todayProgress,
          rules_broken: previousRulesBroken,
        },
      })
    } else {
      setTodayProgress({
        ...todayProgress,
        rules_broken: newRulesBroken,
      })
    }

    toast({
      title: translate("pointsDeducted", language, { points: "1" }),
      description: translate(`rules.${ruleKey}`, language),
      variant: "destructive",
    })

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

    if (success) {
      toast({
        title: translate("pointsAdded", language, { points: points.toString() }),
        description: activity,
      })

      if (isOnline) {
        loadMemberData(selectedMember.id)
      }
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

    if (success) {
      toast({
        title:
          points > 0
            ? translate("pointsAdded", language, { points: points.toString() })
            : translate("pointsDeducted", language, { points: Math.abs(points).toString() }),
        description: reason,
        variant: points < 0 ? "destructive" : "default",
      })

      if (isOnline) {
        loadMemberData(selectedMember.id)
      }
    }
  }

  const resetMemberPoints = async () => {
    if (!selectedMember) return

    const confirmReset = window.confirm(translate("resetConfirm", language).replace("{name}", selectedMember.name))

    if (!confirmReset) return

    setLoading(true)

    try {
      // Record the reset action for potential undo (though complex, we'll just log it for now)
      const resetReason = `Reset all points and progress for ${selectedMember.name}`
      setLastAction({
        type: "transaction", // Or a more specific 'reset' type if needed
        memberId: selectedMember.id,
        points: 0, // Or track the total points before reset if possible
        reason: resetReason,
      })

      await supabaseClient.from("points_transactions").delete().eq("member_id", selectedMember.id)
      await supabaseClient.from("daily_progress").delete().eq("member_id", selectedMember.id)
      await loadMemberData(selectedMember.id)

      console.log("[v0] Successfully reset all data for", selectedMember.name)
      toast({
        title: translate("resetSuccess", language),
        description: selectedMember.name,
      })
    } catch (error) {
      console.error("[v0] Error resetting member data:", error)
      toast({
        title: translate("resetFailed", language),
        variant: "destructive",
      })
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-4 flex items-center justify-center">
          <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
            <Card className="shadow-lg border-red-200">
              <CardContent className="text-center py-8">
                <p className="text-red-600 mb-4">{clientError}</p>
                <Button onClick={() => window.location.reload()}>{translate("reset", language)}</Button>
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
          <Card className="shadow-lg border-blue-200 w-full max-w-md">
            <CardContent className="text-center py-12">
              <Spinner className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <p className="text-blue-600 text-lg font-medium">{translate("connectingToDatabase", language)}</p>
              <p className="text-muted-foreground text-sm mt-2">{translate("loading", language)}</p>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <Toaster />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-2 sm:py-4">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 max-w-4xl">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="flex-1">
              {selectedMember ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMember(null)}
                  className="mb-2 -ml-2 hover:bg-blue-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {translate("backToHome", language)}
                </Button>
              ) : null}
              <h1 className="text-2xl sm:text-4xl font-bold text-primary flex items-center gap-2">
                <Star className="h-5 w-5 sm:h-8 sm:w-8" aria-hidden="true" />
                {translate("title", language)}
              </h1>
              <p className="text-muted-foreground text-xs sm:text-base mt-1">{translate("subtitle", language)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="ml-2 shrink-0 bg-white hover:bg-blue-50"
              aria-label="Toggle language"
            >
              <Languages className="h-4 w-4 mr-1" />
              {language.toUpperCase()}
            </Button>
          </div>

          {lastAction && (
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={undoLastAction}
                disabled={loading}
                className="w-full border-orange-200 hover:bg-orange-50 text-orange-700 bg-white min-h-[48px] touch-manipulation"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                {translate("undoLast", language)}
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <div
              className="flex items-center gap-2"
              role="status"
              aria-label={`Connection status: ${isOnline ? translate("online", language) : translate("offline", language)}`}
            >
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" aria-label={translate("online", language)} />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" aria-label={translate("offline", language)} />
              )}
              {offlineQueue.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs"
                  aria-label={`${offlineQueue.length} transactions ${translate("pending", language)}`}
                >
                  {offlineQueue.length} {translate("pending", language)}
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

          {!selectedMember && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6" role="group">
                {members.map((member) => (
                  <Card
                    key={member.id}
                    className="cursor-pointer hover:shadow-xl transition-all border-2 border-blue-200 hover:border-blue-400 bg-white"
                    onClick={() => setSelectedMember(member)}
                  >
                    <CardContent className="text-center py-8 sm:py-12">
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4">
                        <Image
                          src={member.name === "Dario" ? "/images/dario.png" : "/images/linda.png"}
                          alt={`${member.name}'s profile`}
                          fill
                          className="rounded-full object-cover border-4 border-blue-200 shadow-lg"
                          priority
                        />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-primary">{member.name}</h3>
                      <p className="text-sm text-muted-foreground mt-2">{translate("selectMemberDesc", language)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="shadow-lg border-blue-200 bg-white">
                <CardContent className="text-center py-8 sm:py-12">
                  <Star className="h-12 w-12 text-blue-300 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-semibold mb-2">{translate("selectMember", language)}</h3>
                  <p className="text-muted-foreground">{translate("selectMemberDesc", language)}</p>
                </CardContent>
              </Card>
            </>
          )}

          {selectedMember && (
            <div className="space-y-3 sm:space-y-6">
              <ProgressCard
                selectedMember={selectedMember}
                weeklyPoints={weeklyPoints}
                monthlyPoints={monthlyPoints}
                streakCount={streakCount}
                lang={language}
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
                lang={language}
              />

              <Card className="shadow-lg border-blue-200 bg-white">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    {translate("bonusActivities", language)}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {translate("bonusActivitiesDesc", language)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2" role="list">
                    {BONUS_ACTIVITIES.map((activity, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() =>
                          addBonusPoints(translate(`bonusActivities.${activity.key}`, language), activity.points)
                        }
                        className={`justify-between p-3 sm:p-4 h-auto border-blue-200 hover:bg-blue-50 min-h-[48px] touch-manipulation transition-transform ${
                          swipeDirection === "right" ? "transform translate-x-2" : ""
                        }`}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) =>
                          handleTouchEnd(e, () =>
                            addBonusPoints(translate(`bonusActivities.${activity.key}`, language), activity.points),
                          )
                        }
                        role="listitem"
                      >
                        <span className="text-left flex-1 text-xs sm:text-sm">
                          {translate(`bonusActivities.${activity.key}`, language)}
                        </span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-2 text-xs">
                          +{activity.points}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-blue-200 bg-white">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    {translate("schoolPerformance", language)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => addSchoolReward(75, translate("school.monthlyAvg", language))}
                    className="w-full justify-between p-3 sm:p-4 h-auto border-blue-200 hover:bg-blue-50 min-h-[48px] touch-manipulation"
                  >
                    <span className="text-xs sm:text-sm">{translate("school.monthlyAvg", language)}</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      +75
                    </Badge>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addSchoolReward(150, translate("school.allSubjects", language))}
                    className="w-full justify-between p-3 sm:p-4 h-auto border-blue-200 hover:bg-blue-50 min-h-[48px] touch-manipulation"
                  >
                    <span className="text-xs sm:text-sm">{translate("school.allSubjects", language)}</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      +150
                    </Badge>
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => addSchoolReward(-75, translate("school.belowMin", language))}
                    className="w-full justify-between p-3 sm:p-4 h-auto min-h-[48px] touch-manipulation"
                  >
                    <span className="text-xs sm:text-sm">{translate("school.belowMin", language)}</span>
                    <Badge variant="destructive" className="text-xs">
                      -75
                    </Badge>
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-blue-200 bg-white">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base sm:text-xl">{translate("history", language)}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryExpanded(!historyExpanded)}
                      className="hover:bg-blue-50"
                    >
                      {historyExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          {translate("hideHistory", language)}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          {translate("showHistory", language)}
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {historyExpanded && (
                  <CardContent>
                    <div className="space-y-2 mb-4" role="list">
                      {recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-blue-50/50 border border-blue-100"
                          role="listitem"
                        >
                          <div className="flex-1">
                            <div className="text-xs sm:text-sm font-medium">{transaction.reason}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleDateString(
                                language === "fr" ? "fr-FR" : language === "it" ? "it-IT" : "en-US",
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={transaction.points > 0 ? "secondary" : "destructive"}
                            className={`text-xs ${transaction.points > 0 ? "bg-blue-100 text-blue-800" : ""}`}
                          >
                            {transaction.points > 0 ? "+" : ""}
                            {transaction.points}
                          </Badge>
                        </div>
                      ))}
                      {recentTransactions.length === 0 && (
                        <p className="text-center text-muted-foreground py-4 text-xs sm:text-sm">
                          {translate("noRecentActivity", language)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/history/${selectedMember.id}`)}
                      className="w-full border-blue-200 hover:bg-blue-50"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {translate("viewFullHistory", language)}
                    </Button>
                  </CardContent>
                )}
              </Card>

              <div className="pb-4">
                <Button
                  variant="outline"
                  onClick={resetMemberPoints}
                  disabled={loading}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 bg-white min-h-[48px] touch-manipulation"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {translate("reset", language)} {selectedMember.name}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
