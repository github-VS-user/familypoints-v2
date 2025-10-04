"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2 } from "lucide-react"
import { translate, type Language } from "@/lib/translations"

interface PointsTransaction {
  id: string
  points: number
  reason: string
  transaction_type: string
  created_at: string
}

interface FamilyMember {
  id: string
  name: string
}

export default function FullHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.memberId as string
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [member, setMember] = useState<FamilyMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>("en")

  useEffect(() => {
    const savedLang = localStorage.getItem("familyPointsLanguage") as Language
    if (savedLang && ["en", "fr", "it"].includes(savedLang)) {
      setLanguage(savedLang)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()

      // Load member info
      const { data: memberData } = await supabase.from("family_members").select("*").eq("id", memberId).single()

      if (memberData) {
        setMember(memberData)
      }

      // Load all transactions
      const { data: transactionsData } = await supabase
        .from("points_transactions")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false })

      setTransactions(transactionsData || [])
      setLoading(false)
    }

    loadData()
  }, [memberId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push("/")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {translate("backToHome", language)}
          </Button>

          <h1 className="text-2xl sm:text-4xl font-bold text-primary mb-2">
            {member?.name}'s {translate("fullHistory", language)}
          </h1>
          <p className="text-muted-foreground">
            {translate("recentActivity", language)} ({transactions.length} {translate("recentActivity", language)})
          </p>
        </div>

        <Card className="shadow-lg border-blue-200">
          <CardHeader>
            <CardTitle>{translate("fullHistory", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 border border-blue-100"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{transaction.reason}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString(
                        language === "fr" ? "fr-FR" : language === "it" ? "it-IT" : "en-US",
                      )}
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
              {transactions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{translate("noRecentActivity", language)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
