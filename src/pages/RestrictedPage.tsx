import * as React from "react"
import { ShieldAlert, ArrowLeft, Clock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup" | "members" | "reports" | "privacy" | "terms" | "restricted"
interface Props { onNavigate: (p: Page) => void }

export function RestrictedPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm shadow-lg border-destructive/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="size-8 text-destructive" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            {fr ? "Accès restreint" : "Access restricted"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {fr
              ? "Votre compte a été temporairement verrouillé après plusieurs tentatives de vérification échouées."
              : "Your account has been temporarily locked after multiple failed verification attempts."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Clock className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{fr ? "Temporaire" : "Temporary"}</p>
              <p className="text-xs text-muted-foreground">{fr ? "Réessayez dans quelques minutes ou contactez le support." : "Try again in a few minutes or contact support."}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Mail className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{fr ? "Support" : "Support"}</p>
              <p className="text-xs text-muted-foreground">
                <a href="https://wa.me/243857599332" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">WhatsApp +243 857 599 332</a>
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => onNavigate("home")}>
              <ArrowLeft className="size-4" />{fr ? "Accueil" : "Home"}
            </Button>
            <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => onNavigate("signin")}>
              {fr ? "Se connecter" : "Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
