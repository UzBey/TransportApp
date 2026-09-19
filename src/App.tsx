import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react"
import "./App.css"
import { supabase } from "./supabase"
import { jsPDF } from "jspdf"

type Vehicle = {
  id: number
  kennzeichen: string
  fahrzeugtyp: string | null
  hersteller_modell: string | null
  baujahr: number | null
  kilometerstand: number | null
  verbrauch_l_100km: number | null
  kraftstoffart: string | null
  status: string
  versicherung_monat?: number | null
  steuer_monat?: number | null
  wartungskosten_km?: number | null
  reifen_kosten_km?: number | null
  abschreibung_km?: number | null
}

type Maintenance = {
  id: number
  fahrzeug_id: number | null
  kennzeichen: string | null
  datum: string
  kilometerstand: number | null
  wartungsart: string
  kosten: number | null
  naechste_wartung_km: number | null
  naechste_wartung_datum: string | null
  notiz: string | null
  status?: string | null
  abgeschlossen_am?: string | null
  tatsaechliche_kosten?: number | null
}

type VehicleCheck = {
  id: number
  datum: string
  fahrer: string | null
  status: string | null
}

type Tour = {
  id: number
  tournummer: string
  datum: string
  fahrzeug_id: number | null
  fahrer_id: string | null
  fahrer: string | null
  status: string
  km_start?: number | null
  km_ende?: number | null
  sortOrder?: number | null
}

function getVehicleStatusLabel(status: string | null | undefined): string {
  const value = String(status || "").trim().toLowerCase()
  if (value === "werkstatt") return "🔧 Werkstatt"
  if (value === "außer betrieb" || value === "ausser betrieb") return "⛔ Außer Betrieb"
  return "🟢 Aktiv"
}

function isVehicleAvailableForTour(vehicle: Vehicle): boolean {
  const status = String(vehicle.status || "").trim().toLowerCase()
  return status === "" || status === "aktiv"
}

type Delivery = {
  id: number
  sortOrder?: number | null
  customer: string
  address: string
  plannedTime: string
  status:
    | "Offen"
    | "Unterwegs"
    | "Beim Kunden"
    | "Erledigt"
  arrivalTime?: string
  deliveredTime?: string
  departureTime?: string
  punctuality?: string
  rating?: number
  complaint?: boolean
  note?: string
  kundeId?: number | null
}

type NewDelivery = {
  customer: string
  address: string
  plannedTime: string
  kundeId?: number | null
}

type Customer = {
  id: number
  name: string
  adresse: string | null
  aktiv: boolean
  erstellt_am?: string | null
  geaendert_am?: string | null
}

type CustomerHint = {
  id: number
  kunde_id: number
  hinweis: string
  wichtig: boolean
  aktiv: boolean
}

type CustomerComplaint = {
  id: number
  kunde_id: number | null
  lieferung_id: number | null
  beschreibung: string
  status: string
  erstellt_am: string | null
}

type Defect = {
  category: string
  description: string
  priority: string
  photo?: string
}

type DefectCounts = {
  dringend: number
  wichtig: number
  normal: number
  gesamt: number
}

type DefectRecord = {
  id: number
  fahrzeug_id: number | null
  kennzeichen: string
  fahrer: string
  datum: string
  kategorie: string
  beschreibung: string
  prioritaet: string
  status: string
}

type DefectNotification = {
  kennzeichen: string
  kategorie: string
  beschreibung: string
  prioritaet: string
}

type UserRole = "Admin" | "Disponent" | "Fahrer"

type PermissionKey =
  | "dashboard"
  | "touren"
  | "touren_anlegen"
  | "touren_verwalten"
  | "kunden"
  | "fahrzeuge"
  | "fahrzeugcheck"
  | "maengel"
  | "wartungen"
  | "dokumente"
  | "warnungen"
  | "fahrer"
  | "auswertungen"

type AppUser = {
  id: string
  email: string
  name: string
  rolle: UserRole
  aktiv: boolean
  freigabestatus: "Ausstehend" | "Freigegeben" | "Gesperrt"
  berechtigungen: PermissionKey[]
}

type SopRecord = {
  id: number
  titel: string
  beschreibung: string | null
  inhalt: string
  version: string
  aktiv: boolean
  erstellt_am: string | null
  geaendert_am: string | null
  erstellt_von: string | null
}

type SopConfirmation = {
  id: number
  sop_id: number
  fahrer_id: string
  version: string
  bestaetigt_am: string | null
  bestaetigungstext: string | null
}

type AdminSopConfirmation = SopConfirmation & {
  fahrer_name: string
  fahrer_email: string
}

const permissionOptions: { key: PermissionKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "touren", label: "Touren ansehen" },
  { key: "touren_anlegen", label: "Touren anlegen" },
  { key: "touren_verwalten", label: "Touren verwalten" },
  { key: "kunden", label: "Kundenverwaltung" },
  { key: "fahrzeuge", label: "Fahrzeugverwaltung" },
  { key: "fahrzeugcheck", label: "Fahrzeugcheck" },
  { key: "maengel", label: "Mängel" },
  { key: "wartungen", label: "Wartungen" },
  { key: "dokumente", label: "Dokumente" },
  { key: "warnungen", label: "Warnungen" },
  { key: "fahrer", label: "Fahrer & Arbeitszeit" },
  { key: "auswertungen", label: "Auswertungen" },
]
type DriverProfile = AppUser & {
  telefon: string
  fuehrerscheinnummer: string
  fuehrerschein_gueltig_bis: string
}

type WorkEntry = {
  id: number
  fahrer_id: string
  datum: string
  arbeitsbeginn: string
  arbeitsende: string | null
  pause_minuten: number
  notiz: string | null
}

type DriverShift = {
  id: number
  fahrer_id: string
  startzeit: string
  endzeit: string | null
  status: string
  gesamt_km: number
  notiz: string | null
}

type ShiftVehicleSegment = {
  id: number
  schicht_id: number
  fahrzeug_id: number
  startzeit: string
  endzeit: string | null
  start_km: number
  end_km: number | null
  gefahrene_km: number | null
}

type DocumentRecord = {
  id: number
  fahrzeug_id: number | null
  fahrer_id: string | null
  dokumenttyp: string
  dateiname: string
  speicherpfad: string
  ablaufdatum: string | null
  notiz: string | null
  erstellt_am: string | null
  erstellt_von: string | null
}

type DriverTourStats = {
  touren: number
  erledigteTouren: number
  lieferungen: number
  erledigteLieferungen: number
  verspaeteteLieferungen: number
  kilometer: number
}

const checklistItems = [
  { label: "Reifen", kategorie: "Reifen" },
  { label: "Beleuchtung", kategorie: "Beleuchtung" },
  { label: "Bremsen", kategorie: "Bremsen" },
  { label: "Scheiben", kategorie: "Scheiben und Spiegel" },
  { label: "Spiegel", kategorie: "Scheiben und Spiegel" },
  { label: "Scheibenwischer", kategorie: "Scheiben und Spiegel" },
  { label: "Flüssigkeiten", kategorie: "Sonstiges" },
  { label: "Warnweste", kategorie: "Sonstiges" },
  { label: "Warndreieck", kategorie: "Sonstiges" },
  { label: "Erste-Hilfe-Kasten", kategorie: "Sonstiges" },
  { label: "Laderaum", kategorie: "Laderaum" },
  { label: "Ladungssicherung", kategorie: "Laderaum" },
  { label: "Fahrzeug außen", kategorie: "Fahrzeugschaden" },
  { label: "Sonstiges", kategorie: "Sonstiges" },
]

function getCurrentTime(): string {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function normalizeTime(
  value: string | null | undefined
): string | undefined {
  if (!value) {
    return undefined
  }

  return value.slice(0, 5)
}

function calculatePunctuality(
  plannedTime: string,
  actualTime: string
): string {
  const plannedParts = plannedTime.split(":")
  const actualParts = actualTime.split(":")

  const plannedMinutes =
    Number(plannedParts[0]) * 60 +
    Number(plannedParts[1])

  const actualMinutes =
    Number(actualParts[0]) * 60 +
    Number(actualParts[1])

  const difference =
    actualMinutes - plannedMinutes

  if (difference <= 0) {
    return "Pünktlich"
  }

  return difference + " Min. verspätet"
}

function getTimeDifferenceMinutes(
  plannedTime: string,
  actualTime: string
): number {
  if (!plannedTime || !actualTime) return 0

  const plannedParts = plannedTime.slice(0, 5).split(":").map(Number)
  const actualParts = actualTime.slice(0, 5).split(":").map(Number)

  if (plannedParts.length < 2 || actualParts.length < 2) return 0
  if (plannedParts.some(Number.isNaN) || actualParts.some(Number.isNaN)) return 0

  let difference =
    actualParts[0] * 60 + actualParts[1] -
    (plannedParts[0] * 60 + plannedParts[1])

  // Mitternacht sauber behandeln, z. B. geplant 23:50, Ankunft 00:20.
  if (difference < -720) difference += 1440
  if (difference > 720) difference -= 1440

  return Math.max(0, difference)
}

function getDeliveryDelayMinutes(delivery: Delivery, tourDate?: string): number {
  if (!delivery.plannedTime) return 0

  const planned = delivery.plannedTime.slice(0, 5)

  // Wenn bereits eine tatsächliche Ankunft gespeichert wurde,
  // vergleichen wir ausschließlich geplante und tatsächliche Uhrzeit.
  if (delivery.arrivalTime) {
    return getTimeDifferenceMinutes(planned, delivery.arrivalTime)
  }

  if (!tourDate) return 0

  const today = getToday()

  // Zukünftige Tour: niemals wegen der aktuellen Uhrzeit verspätet.
  if (tourDate > today) return 0

  // Für heutige Touren muss die vollständige lokale Uhrzeit verwendet werden.
  // Dadurch wird z. B. 15:16 um 14:55 NICHT als 661 Minuten verspätet erkannt.
  if (tourDate === today) {
    const now = new Date()
    const plannedParts = planned.split(':').map(Number)
    if (plannedParts.length < 2 || plannedParts.some(Number.isNaN)) return 0

    const plannedDate = new Date(now)
    plannedDate.setHours(plannedParts[0], plannedParts[1], 0, 0)

    const difference = Math.floor((now.getTime() - plannedDate.getTime()) / 60000)
    return Math.max(0, difference)
  }

  // Vergangene Tour: wenn die Lieferung noch offen ist, ist sie tatsächlich überfällig.
  // Wir rechnen dabei mit Datum + Uhrzeit und nicht nur mit der Uhrzeit.
  const plannedParts = planned.split(':').map(Number)
  if (plannedParts.length < 2 || plannedParts.some(Number.isNaN)) return 0

  const plannedDate = new Date(`${tourDate}T${planned}:00`)
  if (Number.isNaN(plannedDate.getTime())) return 0

  return Math.max(
    0,
    Math.floor((Date.now() - plannedDate.getTime()) / 60000)
  )
}

function isDeliveryDelayed(delivery: Delivery, tourDate?: string): boolean {
  if (getDeliveryDelayMinutes(delivery, tourDate) > 0) {
    return true
  }

  return String(delivery.punctuality || "")
    .toLowerCase()
    .includes("verspätet")
}

function getDeliverySortMinutes(delivery: Delivery): number {
  if (!delivery.plannedTime) return 9999

  const parts = delivery.plannedTime.slice(0, 5).split(":").map(Number)
  if (parts.length < 2 || parts.some(Number.isNaN)) return 9999

  return parts[0] * 60 + parts[1]
}

function getNextDeliveryId(deliveries: Delivery[]): number | null {
  const next = [...deliveries]
    .filter((delivery) => delivery.status !== "Erledigt")
    .sort((a, b) => {
      const timeDifference =
        getDeliverySortMinutes(a) - getDeliverySortMinutes(b)

      if (timeDifference !== 0) return timeDifference
      return a.id - b.id
    })[0]

  return next?.id ?? null
}

function getDeliveryAction(delivery: Delivery): string {
  if (delivery.status === "Offen") {
    return "Nächster Schritt: Fahrt zur Lieferung starten"
  }

  if (delivery.status === "Unterwegs") {
    return "Nächster Schritt: Ankunft beim Kunden bestätigen"
  }

  if (delivery.status === "Beim Kunden") {
    if (!delivery.deliveredTime) {
      return "Nächster Schritt: Lieferung als angeliefert erfassen"
    }

    if (!delivery.departureTime) {
      return "Nächster Schritt: Abfahrt vom Kunden erfassen"
    }

    return "Nächster Schritt: Lieferung abschließen"
  }

  return "Lieferung abgeschlossen"
}

function isCompletedTour(tour: Tour): boolean {
  return ["abgeschlossen", "erledigt"].includes(
    String(tour.status || "").trim().toLowerCase()
  )
}

function getTourTrafficLight(
  tour: Tour,
  stats: DispatcherDeliveryStats,
  hasVehicle: boolean
): { color: string; label: string; icon: string } {
  const tourStatus = String(tour.status || "offen").trim().toLowerCase()

  if (["abgeschlossen", "erledigt"].includes(tourStatus)) {
    return { color: "#111827", label: "Tour abgeschlossen", icon: "⚫" }
  }

  if (!tour.fahrer_id && !tour.fahrer) {
    return { color: "#dc2626", label: "Kein Fahrer zugewiesen", icon: "🔴" }
  }

  if (!hasVehicle) {
    return { color: "#dc2626", label: "Kein Fahrzeug zugewiesen", icon: "🔴" }
  }

  if (stats.delayed > 0) {
    return { color: "#dc2626", label: "Verspätung / Problem", icon: "🔴" }
  }

  if (stats.beimKunden > 0) {
    return { color: "#f59e0b", label: "Beim Kunden", icon: "🟡" }
  }

  if (stats.unterwegs > 0) {
    return { color: "#f59e0b", label: "Fahrer unterwegs", icon: "🟡" }
  }

  if (stats.total === 0) {
    return { color: "#f59e0b", label: "Keine Lieferungen", icon: "🟡" }
  }

  return { color: "#16a34a", label: "Alles im Plan", icon: "🟢" }
}

function getDeliveryStep(delivery: Delivery): number {
  if (delivery.status === "Erledigt") return 5
  if (delivery.status === "Beim Kunden" && delivery.departureTime) return 4
  if (delivery.status === "Beim Kunden" && delivery.deliveredTime) return 3
  if (delivery.status === "Beim Kunden") return 2
  if (delivery.status === "Unterwegs") return 1
  return 0
}


function formatCheckDate(dateString: string): string {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return dateString
  }

  return date.toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatTourDate(dateString: string): string {
  const date = new Date(
    dateString + "T00:00:00"
  )

  if (Number.isNaN(date.getTime())) {
    return dateString
  }

  return date.toLocaleDateString("de-DE")
}

type DispatcherDeliveryStats = {
  total: number
  completed: number
  open: number
  unterwegs: number
  beimKunden: number
  delayed: number
  nextPlanned: string | null
  nextCustomer: string | null
  nextAddress: string | null
  nextStatus: string | null
  currentCustomer: string | null
  currentStatus: string | null
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  const [page, setPage] = useState<
    | "dashboard"
    | "vehicle"
    | "tour"
    | "defect"
    | "tour-create"
    | "tour-management"
    | "customers"
    | "users"
    | "sops"
    | "driver-tours"
    | "dispatcher"
    | "fleet"
    | "driver-management"
    | "work-time"
    | "reports"
    | "documents"
    | "warnings"
  >("dashboard")

  // =====================================================
  // BENUTZER & ROLLEN
  // =====================================================

  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot" | "reset">("login")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authNewPassword, setAuthNewPassword] = useState("")
  const [authNewPassword2, setAuthNewPassword2] = useState("")
  const [authName, setAuthName] = useState("")
  const [authMessage, setAuthMessage] = useState("")
  const [authSaving, setAuthSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [appUsers, setAppUsers] = useState<AppUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState("")
  const [assignmentUsers, setAssignmentUsers] = useState<AppUser[]>([])
  const [assignmentUsersLoading, setAssignmentUsersLoading] = useState(false)
  const [permissionDrafts, setPermissionDrafts] = useState<Record<string, PermissionKey[]>>({})
  const [permissionSavingId, setPermissionSavingId] = useState<string | null>(null)

  const [sops, setSops] = useState<SopRecord[]>([])
  const [sopConfirmations, setSopConfirmations] = useState<SopConfirmation[]>([])
  const [sopLoading, setSopLoading] = useState(false)
  const [sopError, setSopError] = useState("")
  const [sopSaving, setSopSaving] = useState(false)
  const [sopConfirmingId, setSopConfirmingId] = useState<number | null>(null)
  const [sopReminderOpen, setSopReminderOpen] = useState(false)
  const [adminSopConfirmations, setAdminSopConfirmations] = useState<AdminSopConfirmation[]>([])
  const [adminSopLoading, setAdminSopLoading] = useState(false)
  const [adminSopError, setAdminSopError] = useState("")
  const [adminSopPdfLoadingId, setAdminSopPdfLoadingId] = useState<string | null>(null)
  const [sopFormOpen, setSopFormOpen] = useState(false)
  const [sopEditingId, setSopEditingId] = useState<number | null>(null)
  const [sopTitle, setSopTitle] = useState("")
  const [sopDescription, setSopDescription] = useState("")
  const [sopContent, setSopContent] = useState("")
  const [sopVersion, setSopVersion] = useState("1.0")

  const isAdmin = currentUser?.rolle === "Admin"
  const canManageSops = isAdmin || currentUser?.rolle === "Disponent"

  function hasPermission(permission: PermissionKey): boolean {
    if (isAdmin) return true
    return Boolean(currentUser?.berechtigungen?.includes(permission))
  }

  const canManageTours =
    hasPermission("touren_verwalten") ||
    hasPermission("touren_anlegen") ||
    hasPermission("fahrzeuge") ||
    hasPermission("fahrer") ||
    hasPermission("warnungen") ||
    hasPermission("auswertungen")

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data } = await supabase.auth.getSession()
      if (mounted) {
        setSession(data.session)
        setAuthLoading(false)
      }
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function loadCurrentUser() {
    if (!session?.user?.id) {
      setCurrentUser(null)
      return
    }

    const { data, error } = await supabase
      .from("benutzer")
      .select("id, email, name, rolle, aktiv, freigabestatus")
      .eq("id", session.user.id)
      .maybeSingle()

    if (error) {
      console.error("Fehler beim Laden des Benutzerprofils:", error)
      setCurrentUser(null)
      return
    }

    if (!data) {
      setCurrentUser(null)
      return
    }

    setCurrentUser({
      id: String(data.id),
      email: String(data.email || session.user.email || ""),
      name: String(data.name || ""),
      rolle: (data.rolle as UserRole) || "Fahrer",
      aktiv: data.aktiv !== false,
      freigabestatus:
        data.freigabestatus === "Freigegeben"
          ? "Freigegeben"
          : data.freigabestatus === "Gesperrt"
            ? "Gesperrt"
            : "Ausstehend",
      berechtigungen: [],
    })

    const { data: permissionRows } = await supabase
      .from("benutzer_berechtigungen")
      .select("berechtigung")
      .eq("benutzer_id", session.user.id)
      .eq("erlaubt", true)

    setCurrentUser((old) => old ? {
      ...old,
      berechtigungen: (permissionRows || []).map((row) => String(row.berechtigung) as PermissionKey),
    } : old)
  }

  useEffect(() => {
    loadCurrentUser()
  }, [session])

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.rolle === "Admin" || currentUser.rolle === "Disponent" || hasPermission("kunden") || hasPermission("touren_verwalten") || hasPermission("touren_anlegen")) {
      loadCustomers()
    }
  }, [currentUser])

  async function loginUser() {
    if (!authEmail.trim() || !authPassword) {
      setAuthMessage("Bitte E-Mail und Passwort eingeben.")
      return
    }

    setAuthSaving(true)
    setAuthMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    })

    setAuthSaving(false)

    if (error) {
      setAuthMessage("Anmeldung fehlgeschlagen: " + error.message)
      return
    }

    setAuthPassword("")
  }

  async function requestPasswordReset() {
    if (!authEmail.trim()) {
      setAuthMessage("Bitte zuerst deine E-Mail-Adresse eingeben.")
      return
    }

    setAuthSaving(true)
    setAuthMessage("")

    const { error } = await supabase.auth.resetPasswordForEmail(
      authEmail.trim(),
      { redirectTo: window.location.origin }
    )

    setAuthSaving(false)

    if (error) {
      setAuthMessage("Passwort-Reset konnte nicht gestartet werden: " + error.message)
      return
    }

    setAuthMessage(
      "Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet. Bitte prüfe auch den Spam-Ordner."
    )
  }

  async function updatePassword() {
    if (!authNewPassword || !authNewPassword2) {
      setAuthMessage("Bitte beide Passwortfelder ausfüllen.")
      return
    }

    if (authNewPassword.length < 6) {
      setAuthMessage("Das neue Passwort muss mindestens 6 Zeichen lang sein.")
      return
    }

    if (authNewPassword !== authNewPassword2) {
      setAuthMessage("Die beiden neuen Passwörter stimmen nicht überein.")
      return
    }

    setAuthSaving(true)
    setAuthMessage("")

    const { error } = await supabase.auth.updateUser({
      password: authNewPassword,
    })

    setAuthSaving(false)

    if (error) {
      setAuthMessage("Passwort konnte nicht geändert werden: " + error.message)
      return
    }

    setAuthNewPassword("")
    setAuthNewPassword2("")
    setAuthPassword("")
    setAuthMessage("Passwort erfolgreich geändert. Du bist jetzt wieder angemeldet.")
    setAuthMode("login")
  }

  async function signupUser() {
    if (!authEmail.trim() || !authPassword || !authName.trim()) {
      setAuthMessage("Bitte Name, E-Mail und Passwort eingeben.")
      return
    }

    if (authPassword.length < 6) {
      setAuthMessage("Das Passwort muss mindestens 6 Zeichen lang sein.")
      return
    }

    setAuthSaving(true)
    setAuthMessage("")

    const { data, error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
      options: {
        data: { name: authName.trim() },
      },
    })

    setAuthSaving(false)

    if (error) {
      setAuthMessage("Registrierung fehlgeschlagen: " + error.message)
      return
    }

    if (!data.session) {
      setAuthMessage("Registrierung erfolgreich. Bitte E-Mail bestätigen und danach anmelden.")
    } else {
      setAuthMessage("Konto erfolgreich angelegt.")
    }

    setAuthPassword("")
  }

  async function logoutUser() {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setAppUsers([])
    setPage("dashboard")
  }

  async function loadAppUsers() {
    if (!isAdmin) return

    setUsersLoading(true)
    setUsersError("")

    const { data, error } = await supabase
      .from("benutzer")
      .select("id, email, name, rolle, aktiv, freigabestatus")
      .order("name", { ascending: true })

    setUsersLoading(false)

    if (error) {
      console.error("Fehler beim Laden der Benutzer:", error)
      setUsersError(error.message)
      return
    }

    setAppUsers(
      (data || []).map((row) => ({
        id: String(row.id),
        email: String(row.email || ""),
        name: String(row.name || ""),
        rolle: (row.rolle as UserRole) || "Fahrer",
        aktiv: row.aktiv !== false,
        freigabestatus:
          row.freigabestatus === "Freigegeben"
            ? "Freigegeben"
            : row.freigabestatus === "Gesperrt"
              ? "Gesperrt"
              : "Ausstehend",
        berechtigungen: [],
      }))
    )

    const { data: permissionRows } = await supabase
      .from("benutzer_berechtigungen")
      .select("benutzer_id, berechtigung")
      .eq("erlaubt", true)

    const grouped: Record<string, PermissionKey[]> = {}
    for (const row of permissionRows || []) {
      const id = String(row.benutzer_id)
      if (!grouped[id]) grouped[id] = []
      grouped[id].push(String(row.berechtigung) as PermissionKey)
    }

    setAppUsers((old) => old.map((user) => ({ ...user, berechtigungen: grouped[user.id] || [] })))
    setPermissionDrafts(grouped)
  }

  async function changeUserApproval(
    userId: string,
    freigabestatus: "Ausstehend" | "Freigegeben" | "Gesperrt"
  ) {
    if (!canManageSops && !isAdmin) return
    if (userId === currentUser?.id) {
      alert("Dein eigener Account kann hier nicht gesperrt oder zurückgesetzt werden.")
      return
    }

    const { error } = await supabase
      .from("benutzer")
      .update({ freigabestatus })
      .eq("id", userId)

    if (error) {
      alert("Benutzerfreigabe konnte nicht geändert werden:\n\n" + error.message)
      return
    }

    setAppUsers((old) =>
      old.map((user) =>
        user.id === userId ? { ...user, freigabestatus } : user
      )
    )

    if (userId === currentUser?.id) {
      setCurrentUser((old) => old ? { ...old, freigabestatus } : old)
    }

    await loadAssignmentUsers()
  }

  async function changeUserRole(userId: string, rolle: UserRole) {
    if (!isAdmin) return

    const { error } = await supabase
      .from("benutzer")
      .update({ rolle })
      .eq("id", userId)

    if (error) {
      alert("Rolle konnte nicht geändert werden:\n\n" + error.message)
      return
    }

    setAppUsers((old) =>
      old.map((user) =>
        user.id === userId ? { ...user, rolle } : user
      )
    )

    if (userId === currentUser?.id) {
      setCurrentUser((old) => old ? { ...old, rolle } : old)
    }
  }

  async function saveUserPermissions(userId: string) {
    if (!isAdmin) return
    const permissions = permissionDrafts[userId] || []
    setPermissionSavingId(userId)

    const { error: deleteError } = await supabase
      .from("benutzer_berechtigungen")
      .delete()
      .eq("benutzer_id", userId)

    if (deleteError) {
      alert("Berechtigungen konnten nicht gespeichert werden:\n\n" + deleteError.message)
      setPermissionSavingId(null)
      return
    }

    if (permissions.length > 0) {
      const { error: insertError } = await supabase
        .from("benutzer_berechtigungen")
        .insert(permissions.map((berechtigung) => ({
          benutzer_id: userId,
          berechtigung,
          erlaubt: true,
        })))

      if (insertError) {
        alert("Berechtigungen konnten nicht gespeichert werden:\n\n" + insertError.message)
        setPermissionSavingId(null)
        return
      }
    }

    setAppUsers((old) => old.map((user) =>
      user.id === userId ? { ...user, berechtigungen: permissions } : user
    ))

    if (userId === currentUser?.id) {
      setCurrentUser((old) => old ? { ...old, berechtigungen: permissions } : old)
    }

    setPermissionSavingId(null)
  }

  function togglePermission(userId: string, permission: PermissionKey) {
    setPermissionDrafts((old) => {
      const current = old[userId] || []
      const next = current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
      return { ...old, [userId]: next }
    })
  }

  async function loadAssignmentUsers() {
    if (!canManageTours) return
    setAssignmentUsersLoading(true)
    const { data, error } = await supabase
      .from("benutzer")
      .select("id, email, name, rolle, aktiv, freigabestatus")
      .eq("rolle", "Fahrer")
      .eq("aktiv", true)
      .eq("freigabestatus", "Freigegeben")
      .order("name", { ascending: true })
    setAssignmentUsersLoading(false)
    if (error) {
      console.error("Fehler beim Laden der Fahrer:", error)
      return
    }
    setAssignmentUsers((data || []).map((row) => ({
      id: String(row.id),
      email: String(row.email || ""),
      name: String(row.name || ""),
      rolle: (row.rolle as UserRole) || "Fahrer",
      aktiv: row.aktiv !== false,
      freigabestatus:
        row.freigabestatus === "Freigegeben"
          ? "Freigegeben"
          : row.freigabestatus === "Gesperrt"
            ? "Gesperrt"
            : "Ausstehend",
      berechtigungen: [],
    })))
  }

  useEffect(() => {
    if (canManageTours) {
      loadAssignmentUsers()
    }
  }, [canManageTours])

  useEffect(() => {
    if (page === "users" && isAdmin) {
      loadAppUsers().then(() => {
        loadAdminSopOverview()
      })
    }
  }, [page, isAdmin])

  useEffect(() => {
    if (page === "users" && isAdmin && appUsers.length > 0) {
      loadAdminSopOverview()
    }
  }, [page, isAdmin, appUsers.length])

  useEffect(() => {
    if (page === "dispatcher" && hasPermission("touren_verwalten")) {
      loadTours()
    }
  }, [page, currentUser])

  useEffect(() => {
    if (page !== "dispatcher" || !canManageTours) return

    const interval = window.setInterval(() => {
      loadTours()
    }, 60000)

    return () => window.clearInterval(interval)
  }, [page, canManageTours])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTimeTick(Date.now())
    }, 30000)

    return () => window.clearInterval(interval)
  }, [])

  // =====================================================
  // FAHRZEUGE
  // =====================================================

  const [vehicle, setVehicle] =
    useState<Vehicle | null>(null)

  const [vehicles, setVehicles] =
    useState<Vehicle[]>([])

  const [, setVehicleLoading] =
    useState(true)

  const [, setVehicleError] =
    useState("")

  const [vehicleCheckVehicleId, setVehicleCheckVehicleId] =
    useState<number | null>(null)

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("fahrzeuge")
      .select("*")
      .order("id", {
        ascending: true,
      })

    if (error) {
      console.error(
        "Fehler beim Laden der Fahrzeuge:",
        error
      )

      return
    }

    const loadedVehicles: Vehicle[] =
      (data || []).map((row) => {
        const item =
          row as Record<string, unknown>

        return {
          id: Number(item.id),

          kennzeichen: String(
            item.kennzeichen ??
              item.kennzeichen ??
              ""
          ),

          fahrzeugtyp:
            item.fahrzeugtyp != null
              ? String(item.fahrzeugtyp)
              : item.fahrzeugtyp != null
              ? String(item.fahrzeugtyp)
              : null,

          hersteller_modell:
            item.hersteller_modell != null
              ? String(item.hersteller_modell)
              : item.hersteller_modell != null
              ? String(item.hersteller_modell)
              : null,

          baujahr:
            item.baujahr != null
              ? Number(item.baujahr)
              : item.baujahr != null
              ? Number(item.baujahr)
              : null,

          kilometerstand:
            item.kilometerstand != null
              ? Number(item.kilometerstand)
              : item.kilometerstand != null
              ? Number(item.kilometerstand)
              : null,

          verbrauch_l_100km:
            item.verbrauch_l_100km != null
              ? Number(item.verbrauch_l_100km)
              : null,

          kraftstoffart:
            item.kraftstoffart != null
              ? String(item.kraftstoffart)
              : null,

          status:
            item.status != null
              ? String(item.status)
              : "",
        }
      })

    setVehicles(loadedVehicles)

    if (loadedVehicles.length > 0) {
      setVehicle(loadedVehicles[0])
      setVehicleCheckVehicleId((old) => old ?? loadedVehicles[0].id)
    }
  }

  useEffect(() => {
    if (!session) return

    async function loadVehicle() {
      setVehicleLoading(true)
      setVehicleError("")

      const { data, error } = await supabase
        .from("fahrzeuge")
        .select("*")
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error(
          "Fehler beim Laden des Fahrzeugs:",
          error
        )

        setVehicle(null)
        setVehicleError(error.message)
      } else if (data) {
        const row =
          data as Record<string, unknown>

        const loadedVehicle: Vehicle = {
          id: Number(row.id),

          kennzeichen: String(
            row.kennzeichen ??
              row.kennzeichen ??
              ""
          ),

          fahrzeugtyp:
            row.fahrzeugtyp != null
              ? String(row.fahrzeugtyp)
              : row.fahrzeugtyp != null
              ? String(row.fahrzeugtyp)
              : null,

          hersteller_modell:
            row.hersteller_modell != null
              ? String(row.hersteller_modell)
              : row.hersteller_modell != null
              ? String(row.hersteller_modell)
              : null,

          baujahr:
            row.baujahr != null
              ? Number(row.baujahr)
              : row.baujahr != null
              ? Number(row.baujahr)
              : null,

          kilometerstand:
            row.kilometerstand != null
              ? Number(row.kilometerstand)
              : row.kilometerstand != null
              ? Number(row.kilometerstand)
              : null,

          verbrauch_l_100km:
            row.verbrauch_l_100km != null
              ? Number(row.verbrauch_l_100km)
              : null,

          kraftstoffart:
            row.kraftstoffart != null
              ? String(row.kraftstoffart)
              : null,

          status:
            row.status != null
              ? String(row.status)
              : "",
        }

        setVehicle(loadedVehicle)
        setVehicles([loadedVehicle])
      } else {
        setVehicle(null)
        setVehicleError(
          "Es wurde noch kein Fahrzeug in Supabase angelegt."
        )
      }

      setVehicleLoading(false)

      await loadVehicles()
    }

    loadVehicle()
  }, [session])

  const vehicleCheckVehicle =
    vehicles.find((item) => item.id === vehicleCheckVehicleId) ||
    null

  // =====================================================
  // LETZTER FAHRZEUGCHECK
  // =====================================================

  const [lastVehicleCheck, setLastVehicleCheck] =
    useState<VehicleCheck | null>(null)

  const [vehicleCheckLoading, setVehicleCheckLoading] =
    useState(false)

  const [vehicleCheckLoadError, setVehicleCheckLoadError] =
    useState("")

  useEffect(() => {
    async function loadLastVehicleCheck() {
      if (!vehicleCheckVehicle) {
        setLastVehicleCheck(null)
        return
      }

      setVehicleCheckLoading(true)
      setVehicleCheckLoadError("")

      const { data, error } = await supabase
        .from("fahrzeugchecks")
        .select("id, datum, fahrer, status")
        .eq("fahrzeug_id", vehicleCheckVehicle.id)
        .order("datum", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error(
          "Fehler beim Laden des letzten Fahrzeugchecks:",
          error
        )

        setLastVehicleCheck(null)
        setVehicleCheckLoadError(
          error.message
        )
      } else if (data) {
        setLastVehicleCheck(
          data as VehicleCheck
        )
      } else {
        setLastVehicleCheck(null)
      }

      setVehicleCheckLoading(false)
    }

    loadLastVehicleCheck()
  }, [vehicleCheckVehicle])

  // =====================================================
  // FAHRZEUGCHECK
  // =====================================================

  const [checklist, setChecklist] =
    useState<Array<"ok" | "bad" | null>>(
      Array(checklistItems.length).fill(null)
    )

  const [checklistDefects, setChecklistDefects] =
    useState<Record<number, { beschreibung: string; prioritaet: string }>>({})

  const [vehicleCheckFinished, setVehicleCheckFinished] =
    useState(false)

  const [vehicleCheckSaving, setVehicleCheckSaving] =
    useState(false)

  const [vehicleCheckMessage, setVehicleCheckMessage] =
    useState("")

  const allChecksCompleted =
    checklist.every((value) => value !== null)

  const vehicleCheckPassed =
    allChecksCompleted && checklist.every((value) => value === "ok")

  function resetVehicleCheck(vehicleId: number | null) {
    setVehicleCheckVehicleId(vehicleId)
    setChecklist(Array(checklistItems.length).fill(null))
    setChecklistDefects({})
    setVehicleCheckFinished(false)
    setVehicleCheckMessage("")
  }

  function setChecklistStatus(
    index: number,
    status: "ok" | "bad"
  ) {
    setChecklist((old) =>
      old.map((value, i) => (i === index ? status : value))
    )

    if (status === "ok") {
      setChecklistDefects((old) => {
        const next = { ...old }
        delete next[index]
        return next
      })
    } else {
      setChecklistDefects((old) => ({
        ...old,
        [index]: old[index] || { beschreibung: "", prioritaet: "Normal" },
      }))
    }
  }

  function updateChecklistDefect(
    index: number,
    field: "beschreibung" | "prioritaet",
    value: string
  ) {
    setChecklistDefects((old) => ({
      ...old,
      [index]: {
        ...(old[index] || { beschreibung: "", prioritaet: "Normal" }),
        [field]: value,
      },
    }))
  }

  async function finishVehicleCheck() {
    if (!vehicleCheckVehicle) {
      alert("Bitte zuerst ein Fahrzeug auswählen.")
      return
    }

    if (!allChecksCompleted) {
      alert("Bitte jeden Prüfpunk entweder mit 'In Ordnung' oder 'Nicht in Ordnung' bewerten.")
      return
    }

    const badIndexes = checklist
      .map((value, index) => (value === "bad" ? index : -1))
      .filter((index) => index >= 0)

    const missingDescriptions = badIndexes.filter(
      (index) => !(checklistDefects[index]?.beschreibung || "").trim()
    )

    if (missingDescriptions.length > 0) {
      alert("Bitte bei jedem Punkt 'Nicht in Ordnung' eine kurze Mangelbeschreibung eintragen.")
      return
    }

    setVehicleCheckSaving(true)
    setVehicleCheckMessage("")

    const { data, error } = await supabase
      .from("fahrzeugchecks")
      .insert({
        fahrzeug_id: vehicleCheckVehicle.id,
        kennzeichen: vehicleCheckVehicle.kennzeichen,
        fahrer: currentUser?.name || currentUser?.email || "Unbekannt",
        status: vehicleCheckPassed ? "Bestanden" : "Nicht bestanden",
        reifen: checklist[0] === "ok",
        beleuchtung: checklist[1] === "ok",
        bremsen: checklist[2] === "ok",
        scheiben: checklist[3] === "ok",
        spiegel: checklist[4] === "ok",
        scheibenwischer: checklist[5] === "ok",
        fluessigkeiten: checklist[6] === "ok",
        warnweste: checklist[7] === "ok",
        warndreieck: checklist[8] === "ok",
        erste_hilfe: checklist[9] === "ok",
        laderaum: checklist[10] === "ok",
        ladungssicherung: checklist[11] === "ok",
        fahrzeug_aussen: checklist[12] === "ok",
      })
      .select("id, datum, fahrer, status")
      .single()

    if (error) {
      setVehicleCheckSaving(false)
      console.error("Fehler beim Speichern des Fahrzeugchecks:", error)
      alert("Fehler beim Speichern des Fahrzeugchecks:\n" + error.message)
      return
    }

    for (const index of badIndexes) {
      const defect = checklistDefects[index]
      const { error: defectError } = await supabase
        .from("maengel")
        .insert({
          fahrzeug_id: vehicleCheckVehicle.id,
          kennzeichen: vehicleCheckVehicle.kennzeichen,
          fahrer: currentUser?.name || currentUser?.email || "Unbekannt",
          kategorie: checklistItems[index].kategorie,
          beschreibung: `${checklistItems[index].label}: ${defect.beschreibung.trim()}`,
          prioritaet: defect.prioritaet,
          status: "Offen",
        })

      if (defectError) {
        console.error("Fehler beim automatischen Speichern des Mangels:", defectError)
      }
    }

    setVehicleCheckSaving(false)
    if (data) setLastVehicleCheck(data as VehicleCheck)
    setVehicleCheckFinished(true)
    setVehicleCheckMessage(
      vehicleCheckPassed
        ? "✓ Fahrzeugcheck bestanden und gespeichert."
        : `⚠ Fahrzeugcheck nicht bestanden. ${badIndexes.length} Mangel/Mängel wurden direkt erfasst.`
    )
  }

  // =====================================================
  // FAHRZEUGVERWALTUNG
  // =====================================================

  type FleetVehicleInfo = Vehicle & {
    lastCheck: VehicleCheck | null
    openDefects: number
    lastMaintenance: Maintenance | null
    maintenanceTotalCost: number
    maintenanceHistory: Maintenance[]
    checkHistory: VehicleCheck[]
    tourCount: number
  }

  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicleInfo[]>([])
  const [fleetLoading, setFleetLoading] = useState(false)
  const [fleetError, setFleetError] = useState("")
  const [fleetEditVehicle, setFleetEditVehicle] = useState<FleetVehicleInfo | null>(null)
  const [fleetEditKilometers, setFleetEditKilometers] = useState("")
  const [fleetEditStatus, setFleetEditStatus] = useState("Aktiv")
  const [fleetEditSaving, setFleetEditSaving] = useState(false)
  const [fleetEditMessage, setFleetEditMessage] = useState("")

  const [vehicleCreateOpen, setVehicleCreateOpen] = useState(false)
  const [vehicleCreateSaving, setVehicleCreateSaving] = useState(false)
  const [vehicleCreateMessage, setVehicleCreateMessage] = useState("")
  const [vehicleCreateKennzeichen, setVehicleCreateKennzeichen] = useState("")
  const [vehicleCreateTyp, setVehicleCreateTyp] = useState("Transporter")
  const [vehicleCreateModell, setVehicleCreateModell] = useState("")
  const [vehicleCreateBaujahr, setVehicleCreateBaujahr] = useState("")
  const [vehicleCreateKm, setVehicleCreateKm] = useState("")
  const [vehicleCreateVerbrauch, setVehicleCreateVerbrauch] = useState("")
  const [vehicleCreateKraftstoff, setVehicleCreateKraftstoff] = useState("Diesel")
  const [vehicleCreateStatus, setVehicleCreateStatus] = useState("Aktiv")

  const [vehicleDeleteTarget, setVehicleDeleteTarget] = useState<Vehicle | null>(null)
  const [vehicleDeleteSaving, setVehicleDeleteSaving] = useState(false)
  const [vehicleDeleteMessage, setVehicleDeleteMessage] = useState("")

  const [maintenanceVehicle, setMaintenanceVehicle] = useState<FleetVehicleInfo | null>(null)
  const [maintenanceDate, setMaintenanceDate] = useState("")
  const [maintenanceKm, setMaintenanceKm] = useState("")
  const [maintenanceType, setMaintenanceType] = useState("Inspektion")
  const [maintenanceCost, setMaintenanceCost] = useState("")
  const [nextMaintenanceKm, setNextMaintenanceKm] = useState("")
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState("")
  const [maintenanceNote, setMaintenanceNote] = useState("")
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")
  const [maintenanceCompletionId, setMaintenanceCompletionId] = useState<number | null>(null)
  const [maintenanceActualCost, setMaintenanceActualCost] = useState("")
  const [maintenanceCompletionSaving, setMaintenanceCompletionSaving] = useState(false)
  const [maintenanceEditId, setMaintenanceEditId] = useState<number | null>(null)
  const [maintenanceEditStatus, setMaintenanceEditStatus] = useState("Offen")
  const [maintenanceEditActualCost, setMaintenanceEditActualCost] = useState("")

  function openMaintenanceCompletion(maintenanceId: number) {
    setMaintenanceCompletionId(maintenanceId)
    setMaintenanceActualCost("")
  }

  function closeMaintenanceCompletion() {
    if (maintenanceCompletionSaving) return
    setMaintenanceCompletionId(null)
    setMaintenanceActualCost("")
  }

  async function completeMaintenance() {
    if (!maintenanceCompletionId) return

    const actualCostText = maintenanceActualCost.trim()
    if (!actualCostText) {
      alert("Bitte die tatsächlichen Kosten eingeben.")
      return
    }

    const actualCost = Number(actualCostText.replace(/\./g, "").replace(/,/g, "."))
    if (!Number.isFinite(actualCost) || actualCost < 0) {
      alert("Bitte einen gültigen Betrag für die tatsächlichen Kosten eingeben.")
      return
    }

    setMaintenanceCompletionSaving(true)
    const { error } = await supabase
      .from("wartungen")
      .update({
        status: "Erledigt",
        tatsaechliche_kosten: actualCost,
        abgeschlossen_am: new Date().toISOString(),
      })
      .eq("id", maintenanceCompletionId)

    if (error) {
      alert("Die Wartung konnte nicht abgeschlossen werden:\n\n" + error.message)
      setMaintenanceCompletionSaving(false)
      return
    }

    const completedVehicle = fleetDetailVehicle
    setMaintenanceCompletionSaving(false)
    setMaintenanceCompletionId(null)
    setMaintenanceActualCost("")

    await loadFleetOverview()
    if (completedVehicle) {
      await openFleetDetail(completedVehicle)
    }
  }
  const [fleetDetailVehicle, setFleetDetailVehicle] = useState<FleetVehicleInfo | null>(null)
  const [fleetDetailLoading, setFleetDetailLoading] = useState(false)
  const [fleetDetailError, setFleetDetailError] = useState("")
  const [driverProfiles, setDriverProfiles] = useState<DriverProfile[]>([])
  const [driverProfileLoading, setDriverProfileLoading] = useState(false)
  const [driverProfileMessage, setDriverProfileMessage] = useState("")
  const [driverProfileError, setDriverProfileError] = useState("")
  const [driverEdit, setDriverEdit] = useState<DriverProfile | null>(null)
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([])
  const [workLoading, setWorkLoading] = useState(false)
  const [workMessage, setWorkMessage] = useState("")
  const [workStart, setWorkStart] = useState("")
  const [workEnd, setWorkEnd] = useState("")
  const [workBreak, setWorkBreak] = useState("30")
  const [workNote, setWorkNote] = useState("")
  const [workDriverId, setWorkDriverId] = useState("")
  const [workDate, setWorkDate] = useState(getToday())

  // =====================================================
  // FAHRER-SCHICHT / AUTOMATISCHE ARBEITSZEIT
  // =====================================================
  const [driverShift, setDriverShift] = useState<DriverShift | null>(null)
  const [driverShiftSegments, setDriverShiftSegments] = useState<ShiftVehicleSegment[]>([])
  const [driverShiftLoading, setDriverShiftLoading] = useState(false)
  const [driverShiftSaving, setDriverShiftSaving] = useState(false)
  const [driverShiftMessage, setDriverShiftMessage] = useState("")
  const [shiftVehicleId, setShiftVehicleId] = useState("")
  const [shiftKm, setShiftKm] = useState("")
  const [shiftEndKm, setShiftEndKm] = useState("")
  const [shiftChangeVehicleId, setShiftChangeVehicleId] = useState("")
  const [shiftChangeEndKm, setShiftChangeEndKm] = useState("")
  const [shiftChangeStartKm, setShiftChangeStartKm] = useState("")
  const [shiftChangeOpen, setShiftChangeOpen] = useState(false)

  const [tourKmStart, setTourKmStart] = useState("")
  const [tourKmEnd, setTourKmEnd] = useState("")
  const [driverStats, setDriverStats] = useState<Record<string, DriverTourStats>>({})
  const [reportStart, setReportStart] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  })
  const [reportEnd, setReportEnd] = useState(getToday())
  const [reportDriverId, setReportDriverId] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState("")
  const [reportStats, setReportStats] = useState({
    tours: 0,
    completedTours: 0,
    deliveries: 0,
    completedDeliveries: 0,
    delayedDeliveries: 0,
    kilometers: 0,
    workMinutes: 0,
  })
  const [reportTourRows, setReportTourRows] = useState<any[]>([])
  const [documentRows, setDocumentRows] = useState<DocumentRecord[]>([])
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState("")
  const [documentMessage, setDocumentMessage] = useState("")
  const [documentVehicleId, setDocumentVehicleId] = useState("")
  const [documentDriverId, setDocumentDriverId] = useState("")
  const [documentType, setDocumentType] = useState("Fahrzeugschein")
  const [documentExpiry, setDocumentExpiry] = useState("")
  const [documentNote, setDocumentNote] = useState("")
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentUploading, setDocumentUploading] = useState(false)
  const [documentFilter, setDocumentFilter] = useState("Alle")
  const [centralWarnings, setCentralWarnings] = useState<Array<{
    id: string
    priority: "dringend" | "wichtig" | "hinweis"
    icon: string
    title: string
    detail: string
    page: "documents" | "fleet" | "defect" | "driver-management" | "dispatcher"
  }>>([])
  const [warningsLoading, setWarningsLoading] = useState(false)
  const [warningsError, setWarningsError] = useState("")



  async function loadFleetOverview() {
    if (!canManageTours) return
    setFleetLoading(true)
    setFleetError("")

    const { data: vehicleRows, error: vehicleError } = await supabase
      .from("fahrzeuge")
      .select("*")
      .order("id", { ascending: true })

    if (vehicleError) {
      console.error("Fehler beim Laden der Fahrzeugübersicht:", vehicleError)
      setFleetError(vehicleError.message)
      setFleetVehicles([])
      setFleetLoading(false)
      return
    }

    const mappedVehicles: Vehicle[] = (vehicleRows || []).map((row) => {
      const item = row as Record<string, unknown>
      return {
        id: Number(item.id),
        kennzeichen: String(item.kennzeichen ?? item.kennzeichen ?? ""),
        fahrzeugtyp: item.fahrzeugtyp != null ? String(item.fahrzeugtyp) : item.fahrzeugtyp != null ? String(item.fahrzeugtyp) : null,
        hersteller_modell: item.hersteller_modell != null ? String(item.hersteller_modell) : item.hersteller_modell != null ? String(item.hersteller_modell) : null,
        baujahr: item.baujahr != null ? Number(item.baujahr) : item.baujahr != null ? Number(item.baujahr) : null,
        kilometerstand: item.kilometerstand != null ? Number(item.kilometerstand) : item.kilometerstand != null ? Number(item.kilometerstand) : null,
        verbrauch_l_100km: item.verbrauch_l_100km != null ? Number(item.verbrauch_l_100km) : null,
        kraftstoffart: item.kraftstoffart != null ? String(item.kraftstoffart) : null,
        status: item.status != null ? String(item.status) : "",
        versicherung_monat: item.versicherung_monat != null ? Number(item.versicherung_monat) : null,
        steuer_monat: item.steuer_monat != null ? Number(item.steuer_monat) : null,
        wartungskosten_km: item.wartungskosten_km != null ? Number(item.wartungskosten_km) : null,
        reifen_kosten_km: item.reifen_kosten_km != null ? Number(item.reifen_kosten_km) : null,
        abschreibung_km: item.abschreibung_km != null ? Number(item.abschreibung_km) : null,
      }
    })

    const fleetInfo = await Promise.all(mappedVehicles.map(async (item) => {
      const [{ data: checkRows }, { count: defectCount }, { data: maintenanceRows }, { count: tourCount }] = await Promise.all([
        supabase.from("fahrzeugchecks").select("id, datum, fahrer, status").eq("fahrzeug_id", item.id).order("datum", { ascending: false }).limit(20),
        supabase.from("maengel").select("id", { count: "exact", head: true }).eq("fahrzeug_id", item.id).eq("status", "Offen"),
        supabase.from("wartungen").select("*").eq("fahrzeug_id", item.id).order("datum", { ascending: false }).limit(50),
        supabase.from("touren").select("id", { count: "exact", head: true }).eq("fahrzeug_id", item.id),
      ])
      const checks = (checkRows || []) as VehicleCheck[]
      const maint = (maintenanceRows || []) as Maintenance[]
      const totalCost = maint.reduce((sum, row) => sum + (Number(row.kosten) || 0), 0)
      return {
        ...item,
        lastCheck: checks[0] || null,
        openDefects: defectCount || 0,
        lastMaintenance: maint[0] || null,
        maintenanceTotalCost: totalCost,
        maintenanceHistory: maint,
        checkHistory: checks,
        tourCount: tourCount || 0,
      }
    }))

    setFleetVehicles(fleetInfo)
    setFleetLoading(false)
  }

  function openVehicleCreate() {
    setVehicleCreateOpen(true)
    setVehicleCreateSaving(false)
    setVehicleCreateMessage("")
    setVehicleCreateKennzeichen("")
    setVehicleCreateTyp("Transporter")
    setVehicleCreateModell("")
    setVehicleCreateBaujahr("")
    setVehicleCreateKm("")
    setVehicleCreateVerbrauch("")
    setVehicleCreateKraftstoff("Diesel")
    setVehicleCreateStatus("Aktiv")
  }

  function closeVehicleCreate() {
    if (vehicleCreateSaving) return
    setVehicleCreateOpen(false)
    setVehicleCreateMessage("")
  }

  async function saveNewVehicle() {
    const kennzeichen = vehicleCreateKennzeichen.trim().toUpperCase()
    const modell = vehicleCreateModell.trim()
    const baujahr = vehicleCreateBaujahr.trim() ? Number(vehicleCreateBaujahr) : null
    const kilometerstand = vehicleCreateKm.trim() ? Number(vehicleCreateKm.replace(/\./g, "").replace(/,/g, ".")) : 0
    const verbrauch = vehicleCreateVerbrauch.trim() ? Number(vehicleCreateVerbrauch.replace(/,/g, ".")) : null

    if (!kennzeichen) {
      setVehicleCreateMessage("Bitte ein Kennzeichen eingeben.")
      return
    }
    if (!modell) {
      setVehicleCreateMessage("Bitte Fahrzeug / Modell eingeben.")
      return
    }
    if (baujahr !== null && (!Number.isInteger(baujahr) || baujahr < 1900 || baujahr > new Date().getFullYear() + 1)) {
      setVehicleCreateMessage("Bitte ein gültiges Baujahr eingeben.")
      return
    }
    if (!Number.isFinite(kilometerstand) || kilometerstand < 0) {
      setVehicleCreateMessage("Bitte einen gültigen Kilometerstand eingeben.")
      return
    }
    if (verbrauch !== null && (!Number.isFinite(verbrauch) || verbrauch < 0)) {
      setVehicleCreateMessage("Bitte einen gültigen Verbrauch eingeben.")
      return
    }

    setVehicleCreateSaving(true)
    setVehicleCreateMessage("")

    const { error } = await supabase
      .from("fahrzeuge")
      .insert({
        kennzeichen: kennzeichen,
        fahrzeugtyp: vehicleCreateTyp.trim() || "Transporter",
        hersteller_modell: modell,
        baujahr: baujahr,
        kilometerstand: Math.round(kilometerstand),
        verbrauch_l_100km: verbrauch,
        kraftstoffart: vehicleCreateKraftstoff,
        wartungskosten_km: 0,
        reifen_kosten_km: 0,
        versicherung_monat: 0,
        steuer_monat: 0,
        abschreibung_km: 0,
        status: vehicleCreateStatus,
      })

    if (error) {
      console.error("Fehler beim Anlegen des Fahrzeugs:", error)
      setVehicleCreateMessage("Fahrzeug konnte nicht angelegt werden: " + error.message)
      setVehicleCreateSaving(false)
      return
    }

    setVehicleCreateMessage("✓ Fahrzeug wurde angelegt.")
    setVehicleCreateSaving(false)
    await loadFleetOverview()
    await loadVehicles()

    window.setTimeout(() => {
      setVehicleCreateOpen(false)
      setVehicleCreateMessage("")
    }, 900)
  }

  function openVehicleDelete(vehicleItem: Vehicle) {
    setVehicleDeleteTarget(vehicleItem)
    setVehicleDeleteSaving(false)
    setVehicleDeleteMessage("")
  }

  function closeVehicleDelete() {
    if (vehicleDeleteSaving) return
    setVehicleDeleteTarget(null)
    setVehicleDeleteMessage("")
  }

  async function deleteVehicle() {
    if (!vehicleDeleteTarget) return

    setVehicleDeleteSaving(true)
    setVehicleDeleteMessage("")

    const { error } = await supabase
      .from("fahrzeuge")
      .delete()
      .eq("id", vehicleDeleteTarget.id)

    if (error) {
      console.error("Fehler beim Löschen des Fahrzeugs:", error)
      if (error.message.toLowerCase().includes("foreign key") || error.message.toLowerCase().includes("violates")) {
        setVehicleDeleteMessage("Fahrzeug kann nicht gelöscht werden, weil es noch in einer Tour verwendet wird. Bitte zuerst die Fahrzeugzuordnung der betreffenden Touren ändern.")
      } else {
        setVehicleDeleteMessage("Fahrzeug konnte nicht gelöscht werden: " + error.message)
      }
      setVehicleDeleteSaving(false)
      return
    }

    setVehicles((old) => old.filter((item) => item.id !== vehicleDeleteTarget.id))
    setFleetVehicles((old) => old.filter((item) => item.id !== vehicleDeleteTarget.id))
    setVehicle((old) => old?.id === vehicleDeleteTarget.id ? null : old)
    setVehicleDeleteSaving(false)
    setVehicleDeleteTarget(null)
    setVehicleDeleteMessage("")
    await loadVehicles()
    await loadFleetOverview()
  }

  function openFleetEdit(vehicleItem: FleetVehicleInfo) {
    setFleetEditVehicle(vehicleItem)
    setFleetEditKilometers(
      vehicleItem.kilometerstand != null
        ? String(vehicleItem.kilometerstand)
        : ""
    )
    setFleetEditStatus(vehicleItem.status || "Aktiv")
    setFleetEditMessage("")
  }

  function closeFleetEdit() {
    if (fleetEditSaving) return
    setFleetEditVehicle(null)
    setFleetEditMessage("")
  }

  async function saveFleetEdit() {
    if (!fleetEditVehicle) return

    const kilometers = Number(fleetEditKilometers.replace(/\./g, "").replace(/,/g, "."))

    if (!Number.isFinite(kilometers) || kilometers < 0) {
      setFleetEditMessage("Bitte einen gültigen Kilometerstand eingeben.")
      return
    }

    setFleetEditSaving(true)
    setFleetEditMessage("")

    const { error } = await supabase
      .from("fahrzeuge")
      .update({
        kilometerstand: Math.round(kilometers),
        status: fleetEditStatus,
      })
      .eq("id", fleetEditVehicle.id)

    if (error) {
      console.error("Fehler beim Aktualisieren des Fahrzeugs:", error)
      setFleetEditMessage(
        "Fahrzeug konnte nicht gespeichert werden: " + error.message
      )
      setFleetEditSaving(false)
      return
    }

    setFleetVehicles((old) =>
      old.map((item) =>
        item.id === fleetEditVehicle.id
          ? {
              ...item,
              kilometerstand: Math.round(kilometers),
              status: fleetEditStatus,
            }
          : item
      )
    )

    setFleetEditMessage("✓ Fahrzeugdaten wurden gespeichert.")
    setFleetEditSaving(false)

    window.setTimeout(() => {
      setFleetEditVehicle(null)
      setFleetEditMessage("")
    }, 900)
  }

  async function openFleetDetail(vehicleItem: FleetVehicleInfo) {
    setFleetDetailVehicle(vehicleItem)
    setFleetDetailError("")
    setFleetDetailLoading(true)

    const [{ data: maintenanceRows, error: maintenanceError }, { data: checkRows, error: checkError }] = await Promise.all([
      supabase.from("wartungen").select("*").eq("fahrzeug_id", vehicleItem.id).order("datum", { ascending: false }).limit(100),
      supabase.from("fahrzeugchecks").select("id, datum, fahrer, status").eq("fahrzeug_id", vehicleItem.id).order("datum", { ascending: false }).limit(100),
    ])

    if (maintenanceError || checkError) {
      setFleetDetailError(maintenanceError?.message || checkError?.message || "Historie konnte nicht geladen werden.")
    }

    const maintenanceHistory = (maintenanceRows || []) as Maintenance[]
    const checkHistory = (checkRows || []) as VehicleCheck[]
    const maintenanceTotalCost = maintenanceHistory.reduce((sum, row) => sum + (String(row.status || "Offen") === "Erledigt" ? (Number(row.tatsaechliche_kosten) || 0) : 0), 0)

    setFleetDetailVehicle({
      ...vehicleItem,
      maintenanceHistory,
      checkHistory,
      maintenanceTotalCost,
    })
    setFleetDetailLoading(false)
  }

  function closeFleetDetail() {
    if (fleetDetailLoading) return
    setFleetDetailVehicle(null)
    setFleetDetailError("")
  }

  function fleetDetailMaintenanceState(vehicleItem: FleetVehicleInfo) {
    return maintenanceState(vehicleItem)
  }

  useEffect(() => {
    if ((page !== "fleet" && page !== "dashboard") || !hasPermission("fahrzeuge")) return
    loadFleetOverview()
  }, [page, currentUser])

  function openMaintenance(vehicleItem: FleetVehicleInfo) {
    setMaintenanceVehicle(vehicleItem)
    setMaintenanceEditId(null)
    setMaintenanceEditStatus("Offen")
    setMaintenanceEditActualCost("")
    setMaintenanceDate(new Date().toISOString().slice(0, 10))
    setMaintenanceKm(vehicleItem.kilometerstand != null ? String(vehicleItem.kilometerstand) : "")
    setMaintenanceType("Inspektion")
    setMaintenanceCost("")
    setNextMaintenanceKm(vehicleItem.kilometerstand != null ? String(vehicleItem.kilometerstand + 10000) : "")
    setNextMaintenanceDate("")
    setMaintenanceNote("")
    setMaintenanceMessage("")
  }

  function openMaintenanceEdit(maintenance: Maintenance) {
    const vehicle = fleetDetailVehicle
    if (!vehicle) return
    setMaintenanceVehicle(vehicle)
    setMaintenanceEditId(maintenance.id)
    setMaintenanceEditStatus(String(maintenance.status || "Offen"))
    setMaintenanceEditActualCost(maintenance.tatsaechliche_kosten != null ? String(maintenance.tatsaechliche_kosten).replace(".", ",") : "")
    setMaintenanceDate(maintenance.datum || new Date().toISOString().slice(0, 10))
    setMaintenanceKm(maintenance.kilometerstand != null ? String(maintenance.kilometerstand) : "")
    setMaintenanceType(maintenance.wartungsart || "Inspektion")
    setMaintenanceCost(maintenance.kosten != null ? String(maintenance.kosten).replace(".", ",") : "")
    setNextMaintenanceKm(maintenance.naechste_wartung_km != null ? String(maintenance.naechste_wartung_km) : "")
    setNextMaintenanceDate(maintenance.naechste_wartung_datum || "")
    setMaintenanceNote(maintenance.notiz || "")
    setMaintenanceMessage("")
  }

  function closeMaintenance() {
    if (maintenanceSaving) return
    setMaintenanceVehicle(null)
    setMaintenanceEditId(null)
    setMaintenanceEditStatus("Offen")
    setMaintenanceEditActualCost("")
    setMaintenanceMessage("")
  }

  function maintenanceState(vehicleItem: FleetVehicleInfo): { label: string; tone: "success" | "warning" | "danger" } {
    const maintenance = vehicleItem.lastMaintenance
    if (!maintenance) return { label: "Noch keine Wartung eingetragen", tone: "warning" }
    if (String(maintenance.status || "Offen") === "Erledigt") {
      return { label: "🟢 Wartung erledigt", tone: "success" }
    }

    const currentKm = vehicleItem.kilometerstand ?? 0
    if (maintenance.naechste_wartung_km != null && currentKm >= maintenance.naechste_wartung_km) {
      return { label: "🔴 Wartung überfällig", tone: "danger" }
    }

    if (maintenance.naechste_wartung_datum) {
      const today = new Date().toISOString().slice(0, 10)
      if (maintenance.naechste_wartung_datum < today) return { label: "🔴 Wartung überfällig", tone: "danger" }
      const diffDays = Math.ceil((new Date(maintenance.naechste_wartung_datum).getTime() - new Date(today).getTime()) / 86400000)
      if (diffDays <= 30) return { label: "🟠 Wartung bald fällig", tone: "warning" }
    }

    if (maintenance.naechste_wartung_km != null && maintenance.naechste_wartung_km - currentKm <= 1000) {
      return { label: "🟠 Wartung bald fällig", tone: "warning" }
    }

    return { label: "🟢 Wartung OK", tone: "success" }
  }

  function maintenanceWarningDetail(vehicleItem: FleetVehicleInfo): string {
    const maintenance = vehicleItem.lastMaintenance
    if (!maintenance) return "Noch keine Wartung eingetragen"

    const currentKm = vehicleItem.kilometerstand ?? 0
    const parts: string[] = []

    if (maintenance.naechste_wartung_km != null) {
      const kmLeft = maintenance.naechste_wartung_km - currentKm
      if (kmLeft < 0) {
        parts.push(`${Math.abs(kmLeft).toLocaleString("de-DE")} km überfällig`)
      } else {
        parts.push(`${kmLeft.toLocaleString("de-DE")} km verbleiben`)
      }
    }

    if (maintenance.naechste_wartung_datum) {
      const today = new Date(getToday())
      const target = new Date(maintenance.naechste_wartung_datum)
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000)
      if (diffDays < 0) {
        parts.push(`${Math.abs(diffDays)} Tage überfällig`)
      } else if (diffDays === 0) {
        parts.push("heute fällig")
      } else {
        parts.push(`in ${diffDays} Tagen`)
      }
    }

    return parts.join(" · ") || "Kein nächster Wartungstermin hinterlegt"
  }

  async function saveMaintenance() {
    if (!maintenanceVehicle) return
    if (!maintenanceDate || !maintenanceType.trim()) {
      setMaintenanceMessage("Bitte Datum und Wartungsart angeben.")
      return
    }
    const km = maintenanceKm.trim() ? Number(maintenanceKm.replace(/\./g, "").replace(/,/g, ".")) : null
    const cost = maintenanceCost.trim() ? Number(maintenanceCost.replace(/\./g, "").replace(/,/g, ".")) : 0
    const nextKm = nextMaintenanceKm.trim() ? Number(nextMaintenanceKm.replace(/\./g, "").replace(/,/g, ".")) : null
    if (km != null && (!Number.isFinite(km) || km < 0)) { setMaintenanceMessage("Bitte einen gültigen Kilometerstand eingeben."); return }
    if (!Number.isFinite(cost) || cost < 0) { setMaintenanceMessage("Bitte gültige Wartungskosten eingeben."); return }
    if (nextKm != null && (!Number.isFinite(nextKm) || nextKm < 0)) { setMaintenanceMessage("Bitte einen gültigen Kilometerstand für die nächste Wartung eingeben."); return }

    let actualCost: number | null = null
    if (maintenanceEditId != null && maintenanceEditStatus === "Erledigt") {
      const actualText = maintenanceEditActualCost.trim()
      if (!actualText) { setMaintenanceMessage("Bitte die tatsächlichen Kosten eingeben."); setMaintenanceSaving(false); return }
      actualCost = Number(actualText.replace(/\./g, "").replace(/,/g, "."))
      if (!Number.isFinite(actualCost) || actualCost < 0) { setMaintenanceMessage("Bitte gültige tatsächliche Kosten eingeben."); setMaintenanceSaving(false); return }
    }

    setMaintenanceSaving(true)
    setMaintenanceMessage("")

    const maintenancePayload = {
      fahrzeug_id: maintenanceVehicle.id,
      kennzeichen: maintenanceVehicle.kennzeichen,
      datum: maintenanceDate,
      kilometerstand: km != null ? Math.round(km) : null,
      wartungsart: maintenanceType.trim(),
      kosten: cost,
      naechste_wartung_km: nextKm != null ? Math.round(nextKm) : null,
      naechste_wartung_datum: nextMaintenanceDate || null,
      notiz: maintenanceNote.trim() || null,
      ...(maintenanceEditId != null && maintenanceEditStatus === "Erledigt" ? { tatsaechliche_kosten: actualCost } : {}),
    }

    const { error } = maintenanceEditId != null
      ? await supabase.from("wartungen").update(maintenancePayload).eq("id", maintenanceEditId)
      : await supabase.from("wartungen").insert({ ...maintenancePayload, status: "Offen" })
    if (error) {
      console.error("Fehler beim Speichern der Wartung:", error)
      setMaintenanceMessage("Wartung konnte nicht gespeichert werden: " + error.message)
      setMaintenanceSaving(false)
      return
    }
    setMaintenanceMessage(maintenanceEditId != null ? "✓ Wartung wurde geändert." : "✓ Wartung wurde gespeichert.")
    setMaintenanceSaving(false)
    await loadFleetOverview()
    if (fleetDetailVehicle) {
      await openFleetDetail(fleetDetailVehicle)
    }
    window.setTimeout(() => { setMaintenanceVehicle(null); setMaintenanceEditId(null); setMaintenanceEditActualCost(""); setMaintenanceMessage("") }, 700)
  }

  // =====================================================
  // TOUREN
  // =====================================================

  const [tour, setTour] =
    useState<Tour | null>(null)

  const [tours, setTours] =
    useState<Tour[]>([])

  const [selectedTourId, setSelectedTourId] =
    useState<number | null>(null)
  const [showCompletedTours, setShowCompletedTours] =
    useState(false)

  const [deliveries, setDeliveries] =
    useState<Delivery[]>([])

  const [tourLoading, setTourLoading] =
    useState(true)

  const [tourError, setTourError] =
    useState("")

  const [activeDelivery, setActiveDelivery] =
    useState<number | null>(null)

  const [deliveryMessage, setDeliveryMessage] =
    useState("")

  const [currentTimeTick, setCurrentTimeTick] =
    useState(Date.now())

  const [deliverySaving, setDeliverySaving] =
    useState(false)

  const [dispatcherDeliveryStats, setDispatcherDeliveryStats] =
    useState<Record<number, DispatcherDeliveryStats>>({})

  const [tourNextPlannedTimes, setTourNextPlannedTimes] =
    useState<Record<number, string | null>>({})

  // =====================================================
  // KUNDENVERWALTUNG
  // =====================================================

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerHints, setCustomerHints] = useState<CustomerHint[]>([])
  const [customerComplaints, setCustomerComplaints] = useState<CustomerComplaint[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerFormName, setCustomerFormName] = useState("")
  const [customerFormAddress, setCustomerFormAddress] = useState("")
  const [customerEditingId, setCustomerEditingId] = useState<number | null>(null)
  const [customerFormMessage, setCustomerFormMessage] = useState("")
  const [customerHintText, setCustomerHintText] = useState("")
  const [customerHintSavingId, setCustomerHintSavingId] = useState<number | null>(null)

  async function loadCustomers() {
    if (!session?.user?.id) return
    setCustomersLoading(true)
    const [customersResult, hintsResult, complaintsResult] = await Promise.all([
      supabase
        .from("kunden")
        .select("id, name, adresse, aktiv, erstellt_am, geaendert_am")
        .order("name", { ascending: true }),
      supabase
        .from("kunden_hinweise")
        .select("id, kunde_id, hinweis, wichtig, aktiv")
        .eq("aktiv", true)
        .order("id", { ascending: false }),
      supabase
        .from("kundenbeschwerden")
        .select("id, kunde_id, lieferung_id, beschreibung, status, erstellt_am")
        .order("erstellt_am", { ascending: false })
        .limit(500),
    ])

    if (customersResult.error) {
      console.error("Fehler beim Laden der Kunden:", customersResult.error)
      setCustomerFormMessage("Kunden konnten nicht geladen werden: " + customersResult.error.message)
    } else {
      setCustomers((customersResult.data || []).map((row: any) => ({
        id: Number(row.id),
        name: String(row.name || ""),
        adresse: row.adresse != null ? String(row.adresse) : null,
        aktiv: row.aktiv !== false,
        erstellt_am: row.erstellt_am || null,
        geaendert_am: row.geaendert_am || null,
      })))
    }

    if (!hintsResult.error) {
      setCustomerHints((hintsResult.data || []).map((row: any) => ({
        id: Number(row.id),
        kunde_id: Number(row.kunde_id),
        hinweis: String(row.hinweis || ""),
        wichtig: row.wichtig !== false,
        aktiv: row.aktiv !== false,
      })))
    }

    if (!complaintsResult.error) {
      setCustomerComplaints((complaintsResult.data || []).map((row: any) => ({
        id: Number(row.id),
        kunde_id: row.kunde_id != null ? Number(row.kunde_id) : null,
        lieferung_id: row.lieferung_id != null ? Number(row.lieferung_id) : null,
        beschreibung: String(row.beschreibung || ""),
        status: String(row.status || "Offen"),
        erstellt_am: row.erstellt_am || null,
      })))
    }

    setCustomersLoading(false)
  }

  function resetCustomerForm() {
    setCustomerEditingId(null)
    setCustomerFormName("")
    setCustomerFormAddress("")
    setCustomerFormMessage("")
    setCustomerHintText("")
  }

  function editCustomer(customer: Customer) {
    setCustomerEditingId(customer.id)
    setCustomerFormName(customer.name)
    setCustomerFormAddress(customer.adresse || "")
    setCustomerFormMessage("")
    setCustomerHintText("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function saveCustomer() {
    const name = customerFormName.trim()
    const address = customerFormAddress.trim()
    if (!name) {
      setCustomerFormMessage("Bitte einen Kundennamen eingeben.")
      return
    }

    const duplicate = customers.find(
      (item) =>
        item.id !== customerEditingId &&
        item.name.trim().toLowerCase() === name.toLowerCase()
    )
    if (duplicate) {
      setCustomerFormMessage("Dieser Kunde existiert bereits.")
      return
    }

    setCustomerSaving(true)
    setCustomerFormMessage("")

    const payload = {
      name,
      adresse: address || null,
      geaendert_am: new Date().toISOString(),
    }

    const result = customerEditingId
      ? await supabase.from("kunden").update(payload).eq("id", customerEditingId)
      : await supabase.from("kunden").insert({ ...payload, aktiv: true })

    if (result.error) {
      setCustomerFormMessage("Kunde konnte nicht gespeichert werden: " + result.error.message)
      setCustomerSaving(false)
      return
    }

    const successMessage = customerEditingId ? "✓ Kunde wurde aktualisiert." : "✓ Kunde wurde angelegt."
    resetCustomerForm()
    setCustomerFormMessage(successMessage)
    setCustomerSaving(false)
    await loadCustomers()
  }

  async function toggleCustomerActive(customer: Customer) {
    const nextActive = !customer.aktiv
    const { error } = await supabase
      .from("kunden")
      .update({ aktiv: nextActive, geaendert_am: new Date().toISOString() })
      .eq("id", customer.id)

    if (error) {
      alert("Kundenstatus konnte nicht geändert werden:\n\n" + error.message)
      return
    }
    await loadCustomers()
  }

  async function addCustomerHint(kundeId: number) {
    const text = customerHintText.trim()
    if (!text) return
    setCustomerHintSavingId(kundeId)
    const { error } = await supabase.from("kunden_hinweise").insert({
      kunde_id: kundeId,
      hinweis: text,
      wichtig: true,
      aktiv: true,
      erstellt_von: session?.user?.id || null,
    })
    setCustomerHintSavingId(null)
    if (error) {
      alert("Kundenhinweis konnte nicht gespeichert werden:\n\n" + error.message)
      return
    }
    setCustomerHintText("")
    await loadCustomers()
  }

  async function deactivateCustomerHint(id: number) {
    const { error } = await supabase.from("kunden_hinweise").update({ aktiv: false }).eq("id", id)
    if (error) {
      alert("Kundenhinweis konnte nicht deaktiviert werden:\n\n" + error.message)
      return
    }
    await loadCustomers()
  }

  function getHintsForCustomer(kundeId: number): CustomerHint[] {
    return customerHints.filter((item) => item.kunde_id === kundeId && item.aktiv)
  }

  function findCustomerByName(name: string): Customer | null {
    const normalized = name.trim().toLowerCase()
    if (!normalized) return null
    return customers.find((item) => item.aktiv && item.name.trim().toLowerCase() === normalized) || null
  }

  function handleNewDeliveryCustomerChange(index: number, value: string) {
    const customer = findCustomerByName(value)
    setNewDeliveries((old) =>
      old.map((delivery, i) =>
        i === index
          ? {
              ...delivery,
              customer: value,
              address: customer?.adresse || (customer ? "" : delivery.address),
              kundeId: customer?.id || null,
            }
          : delivery
      )
    )
  }

  // =====================================================
  // PUNKT 11.7 – LIVE REALTIME FÜR TOUREN UND LIEFERUNGEN
  // =====================================================
  // Die Tagessteuerung und der Fahrerbereich reagieren automatisch
  // auf Änderungen in Supabase. Der 60-Sekunden-Refresh oben bleibt
  // bewusst als Fallback bestehen, falls Realtime einmal nicht verfügbar ist.
  useEffect(() => {
    if (!session) return

    let refreshTimer: number | null = null

    const scheduleLiveRefresh = () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer)
      }

      // Mehrere Realtime-Ereignisse in kurzer Folge werden gebündelt.
      refreshTimer = window.setTimeout(async () => {
        try {
          await loadTours()

          if (tour?.id) {
            await loadDeliveries(tour.id)
          }

          await loadDashboardStats()

          if (page === "fleet" || page === "dispatcher") {
            await loadFleetOverview()
          }
        } catch (refreshError) {
          console.error(
            "Fehler bei der Live-Aktualisierung:",
            refreshError
          )
        }
      }, 300)
    }

    const channel = supabase
      .channel("transportapp-live-touren-lieferungen")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "touren",
        },
        () => {
          scheduleLiveRefresh()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lieferungen",
        },
        () => {
          scheduleLiveRefresh()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fahrzeuge",
        },
        () => {
          scheduleLiveRefresh()
        }
      )
      .subscribe((status) => {
        console.log(
          "TransportApp Realtime:",
          status
        )
      })

    return () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer)
      }

      supabase.removeChannel(channel)
    }
  }, [
    session,
    page,
    tour?.id,
  ])



  // =====================================================
  // DASHBOARD-KENNZAHLEN
  // =====================================================

  const [dashboardLoading, setDashboardLoading] =
    useState(true)

  const [dashboardError, setDashboardError] =
    useState("")

  const [dashboardStats, setDashboardStats] = useState({
    toursToday: 0,
    deliveriesToday: 0,
    completedToday: 0,
    openToday: 0,
    delayedToday: 0,
  })

  // =====================================================
  // ALLE TOUREN LADEN
  // =====================================================

  const visibleTours = showCompletedTours
    ? tours
    : tours.filter((item) => !isCompletedTour(item))

  async function loadTours(
    preferredTourId?: number | null
  ) {
    setTourLoading(true)
    setTourError("")

    let tourQuery = supabase
      .from("touren")
      .select(
        "id, tournummer, datum, fahrzeug_id, fahrer_id, fahrer, status, km_start, km_ende"
      )

    // Fahrer sehen auch auf UI-Ebene nur ihre eigenen Touren.
    // Die eigentliche Sicherheit wird zusätzlich durch Supabase RLS erzwungen.
    if (currentUser?.rolle === "Fahrer" && currentUser.id) {
      tourQuery = tourQuery.eq("fahrer_id", currentUser.id)
    }

    const { data, error } = await tourQuery
      .order("datum", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      })

    if (error) {
      console.error(
        "Fehler beim Laden der Touren:",
        error
      )

      setTours([])
      setTour(null)
      setDeliveries([])
      setTourError(error.message)
      setTourLoading(false)
      return
    }

    const loadedTours: Tour[] =
      (data || []).map((row) => ({
        id: Number(row.id),
        tournummer: String(
          row.tournummer
        ),
        datum: String(row.datum),
        fahrzeug_id:
          row.fahrzeug_id != null
            ? Number(row.fahrzeug_id)
            : null,
        fahrer_id:
          row.fahrer_id != null
            ? String(row.fahrer_id)
            : null,
        fahrer:
          row.fahrer != null
            ? String(row.fahrer)
            : null,
        status:
          row.status != null
            ? String(row.status)
            : "Offen",
        km_start:
          row.km_start != null
            ? Number(row.km_start)
            : null,
        km_ende:
          row.km_ende != null
            ? Number(row.km_ende)
            : null,
      }))

    // Nächste geplante Zustellzeit je Tour laden. Diese Information wird
    // auch im Bereich "Meine Touren" angezeigt.
    if (loadedTours.length > 0) {
      const { data: tourDeliveryTimes, error: tourDeliveryTimesError } =
        await supabase
          .from("lieferungen")
          .select("tour_id, status, geplante_zeit")
          .in("tour_id", loadedTours.map((item) => item.id))

      if (!tourDeliveryTimesError) {
        const nextTimes: Record<number, string | null> = {}

        ;(tourDeliveryTimes || []).forEach((row) => {
          const tourId = Number(row.tour_id)
          const status = String(row.status || "").trim().toLowerCase()
          const planned = normalizeTime(row.geplante_zeit)

          if (!planned || status === "erledigt") return

          if (!Object.prototype.hasOwnProperty.call(nextTimes, tourId) ||
              !nextTimes[tourId] || planned < String(nextTimes[tourId])) {
            nextTimes[tourId] = planned
          }
        })

        loadedTours.forEach((item) => {
          if (!Object.prototype.hasOwnProperty.call(nextTimes, item.id)) {
            nextTimes[item.id] = null
          }
        })

        setTourNextPlannedTimes(nextTimes)

        // Touren chronologisch nach Datum und anschließend nach der
        // nächsten geplanten Zustellzeit sortieren. Die Erstellungs-ID
        // darf nicht mehr die Reihenfolge bestimmen.
        loadedTours.sort((a, b) => {
          const dateCompare = a.datum.localeCompare(b.datum)
          if (dateCompare !== 0) return dateCompare

          const timeA = nextTimes[a.id]
          const timeB = nextTimes[b.id]

          if (!timeA && !timeB) return 0
          if (!timeA) return 1
          if (!timeB) return -1

          return timeA.localeCompare(timeB)
        })
      }
    } else {
      setTourNextPlannedTimes({})

      // Auch Touren ohne Lieferungen werden nach dem Tourdatum sortiert.
      loadedTours.sort((a, b) => a.datum.localeCompare(b.datum))
    }

    setTours(loadedTours)

    // Für Admin/Disponent wird der Tourstatus zusätzlich aus den Lieferungen
    // abgeglichen. Dadurch erscheint eine vollständig erledigte Tour auch dann
    // als "Abgeschlossen", wenn der Status vorher noch "Offen" war.
    if (canManageTours) {
      const today = getToday()
      const todaysTours = loadedTours.filter(
        (item) => item.datum === today
      )

      if (todaysTours.length > 0) {
        const { data: todayDeliveries, error: deliveryStatusError } =
          await supabase
            .from("lieferungen")
            .select("tour_id, status")
            .in(
              "tour_id",
              todaysTours.map((item) => item.id)
            )

        if (!deliveryStatusError) {
          const deliveriesByTour = new Map<number, string[]>()
          const dispatcherStats: Record<number, DispatcherDeliveryStats> = {}

          const now = new Date()
          const currentMinutes = now.getHours() * 60 + now.getMinutes()

          const { data: dispatcherDeliveryRows } = await supabase
            .from("lieferungen")
            .select("tour_id, status, geplante_zeit, puenktlichkeit, kundename, adresse")
            .in("tour_id", todaysTours.map((item) => item.id))

          ;(dispatcherDeliveryRows || []).forEach((row) => {
            const tourId = Number(row.tour_id)
            const existing = dispatcherStats[tourId] || {
              total: 0,
              completed: 0,
              open: 0,
              unterwegs: 0,
              beimKunden: 0,
              delayed: 0,
              nextPlanned: null,
              nextCustomer: null,
              nextAddress: null,
              nextStatus: null,
              currentCustomer: null,
              currentStatus: null,
            }

            existing.total += 1

            const status = String(row.status || "").trim().toLowerCase()
            if (status === "erledigt") {
              existing.completed += 1
            } else {
              existing.open += 1
            }

            if (status === "unterwegs") {
              existing.unterwegs += 1
            }

            if (status === "beim kunden") {
              existing.beimKunden += 1
            }

            // Für die Live-Anzeige gilt der aktivste aktuelle Zustand zuerst:
            // Beim Kunden > Unterwegs.
            if (status === "beim kunden") {
              existing.currentCustomer = row.kundename != null ? String(row.kundename) : null
              existing.currentStatus = "Beim Kunden"
            } else if (status === "unterwegs" && existing.currentStatus !== "Beim Kunden") {
              existing.currentCustomer = row.kundename != null ? String(row.kundename) : null
              existing.currentStatus = "Unterwegs"
            }

            const punctuality = String(row.puenktlichkeit || "").toLowerCase()
            let isDelayed = punctuality.includes("verspätet")

            const planned = normalizeTime(row.geplante_zeit)
            if (!isDelayed && planned && status !== "erledigt") {
              const parts = planned.split(":")
              const plannedMinutes = Number(parts[0]) * 60 + Number(parts[1])
              isDelayed = plannedMinutes < currentMinutes
            }

            if (isDelayed) {
              existing.delayed += 1
            }

            if (planned && status !== "erledigt") {
              if (!existing.nextPlanned || planned < existing.nextPlanned) {
                existing.nextPlanned = planned
                existing.nextCustomer = row.kundename != null ? String(row.kundename) : null
                existing.nextAddress = row.adresse != null ? String(row.adresse) : null
                existing.nextStatus = String(row.status || "Offen")
              }
            }

            dispatcherStats[tourId] = existing
          })

          setDispatcherDeliveryStats(dispatcherStats)

          ;(todayDeliveries || []).forEach((row) => {
            const tourId = Number(row.tour_id)
            const list = deliveriesByTour.get(tourId) || []
            list.push(String(row.status || ""))
            deliveriesByTour.set(tourId, list)
          })

          for (const item of todaysTours) {
            const statuses = deliveriesByTour.get(item.id) || []
            if (
              statuses.length > 0 &&
              statuses.every(
                (status) =>
                  status.trim().toLowerCase() === "erledigt"
              ) &&
              String(item.status || "")
                .trim()
                .toLowerCase() !== "abgeschlossen"
            ) {
              const { error: syncError } = await supabase
                .from("touren")
                .update({ status: "Abgeschlossen" })
                .eq("id", item.id)

              if (!syncError) {
                item.status = "Abgeschlossen"
              }
            }
          }

          setTours([...loadedTours])
        }
      } else {
        setDispatcherDeliveryStats({})
      }
    }

    let targetId =
      preferredTourId ?? selectedTourId

    if (
      !targetId ||
      !loadedTours.some(
        (item) => item.id === targetId
      )
    ) {
      targetId =
        loadedTours.length > 0
          ? loadedTours[0].id
          : null
    }

    setSelectedTourId(targetId)

    if (targetId) {
      const selected =
        loadedTours.find(
          (item) => item.id === targetId
        ) || null

      setTour(selected)

      await loadDeliveries(targetId)
    } else {
      setTour(null)
      setDeliveries([])
    }

    setTourLoading(false)
  }

  async function loadDeliveries(
    tourId: number
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("lieferungen")
      .select(
        `
          id,
          tour_id,
          sortierung,
          kunde_id,
          kundename,
          adresse,
          geplante_zeit,
          status,
          ankunftszeit,
          angeliefert_zeit,
          abfahrtszeit,
          puenktlichkeit,
          bewertung,
          beschwerde,
          notiz
        `
      )
      .eq("tour_id", tourId)
      .order("id", {
        ascending: true,
      })

    if (error) {
      console.error(
        "Fehler beim Laden der Lieferungen:",
        error
      )

      setDeliveries([])
      setTourError(error.message)
      return
    }

    const loadedDeliveries: Delivery[] =
      (data || []).map((row) => ({
        id: Number(row.id),
        customer: String(
          row.kundename
        ),
        address: String(
          row.adresse || ""
        ),
        plannedTime:
          normalizeTime(
            row.geplante_zeit
          ) || "",
        status:
          (row.status as Delivery["status"]) ||
          "Offen",
        arrivalTime:
          normalizeTime(
            row.ankunftszeit
          ),
        deliveredTime:
          normalizeTime(
            row.angeliefert_zeit
          ),
        departureTime:
          normalizeTime(
            row.abfahrtszeit
          ),
        punctuality:
          row.puenktlichkeit ||
          undefined,
        rating:
          row.bewertung != null
            ? Number(row.bewertung)
            : undefined,
        complaint:
          row.beschwerde || false,
        note:
          row.notiz || undefined,
        kundeId:
          row.kunde_id != null ? Number(row.kunde_id) : null,
      }))

    // Lieferungen zuerst nach manueller Reihenfolge sortieren.
    // Alte Datensätze ohne Reihenfolge bleiben nach geplanter Zeit sortiert.
    loadedDeliveries.sort((a, b) => {
      const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder

      const timeA = getDeliverySortMinutes(a)
      const timeB = getDeliverySortMinutes(b)
      if (timeA !== timeB) return timeA - timeB
      return a.id - b.id
    })

    setDeliveries(
      loadedDeliveries
    )
  }

  // =====================================================
  // DASHBOARD-KENNZAHLEN AUS SUPABASE LADEN
  // =====================================================

  async function loadCentralWarnings() {
    if (!canManageTours) {
      setCentralWarnings([])
      return
    }

    setWarningsLoading(true)
    setWarningsError("")

    try {
      const today = getToday()
      const now = new Date()
      const soonDate = new Date(now)
      soonDate.setDate(soonDate.getDate() + 30)
      const soon = `${soonDate.getFullYear()}-${String(soonDate.getMonth() + 1).padStart(2, "0")}-${String(soonDate.getDate()).padStart(2, "0")}`

      const [documentsResult, maintenanceResult, defectsResult, vehiclesResult, driversResult, toursResult] =
        await Promise.all([
          supabase
            .from("dokumente")
            .select("id, fahrzeug_id, fahrer_id, dokumenttyp, dateiname, ablaufdatum")
            .order("ablaufdatum", { ascending: true }),
          supabase
            .from("wartungen")
            .select("id, fahrzeug_id, kennzeichen, datum, wartungsart, status, naechste_wartung_km, naechste_wartung_datum")
            .order("datum", { ascending: false }),
          supabase
            .from("maengel")
            .select("id, fahrzeug_id, kennzeichen, kategorie, prioritaet, beschreibung, status")
            .neq("status", "Erledigt"),
          supabase
            .from("fahrzeuge")
            .select("id, kennzeichen, kilometerstand, status"),
          supabase
            .from("benutzer")
            .select("id, name, email, rolle, aktiv, fuehrerschein_gueltig_bis")
            .eq("rolle", "Fahrer")
            .eq("aktiv", true),
          supabase
            .from("touren")
            .select("id, tournummer, datum")
            .gte("datum", today),
        ])

      const firstError =
        documentsResult.error ||
        maintenanceResult.error ||
        defectsResult.error ||
        vehiclesResult.error ||
        driversResult.error ||
        toursResult.error

      if (firstError) {
        throw firstError
      }

      const warnings: Array<{
        id: string
        priority: "dringend" | "wichtig" | "hinweis"
        icon: string
        title: string
        detail: string
        page: "documents" | "fleet" | "defect" | "driver-management" | "dispatcher"
      }> = []

      for (const doc of documentsResult.data || []) {
        if (!doc.ablaufdatum) continue
        if (doc.ablaufdatum < today) {
          warnings.push({
            id: `document-expired-${doc.id}`,
            priority: "dringend",
            icon: "📄",
            title: `${doc.dokumenttyp} – abgelaufen`,
            detail: `${doc.dateiname} · ${doc.ablaufdatum}`,
            page: "documents",
          })
        } else if (doc.ablaufdatum <= soon) {
          warnings.push({
            id: `document-soon-${doc.id}`,
            priority: "wichtig",
            icon: "📄",
            title: `${doc.dokumenttyp} – läuft bald ab`,
            detail: `${doc.dateiname} · ${doc.ablaufdatum}`,
            page: "documents",
          })
        }
      }

      const vehicleMap = new Map(
        (vehiclesResult.data || []).map((vehicle: any) => [
          Number(vehicle.id),
          vehicle,
        ])
      )

      // Pro Fahrzeug nur die aktuellste Wartung auswerten.
      // Dadurch können alte, bereits erledigte Wartungen keine veralteten Warnungen
      // mehr erzeugen, sobald eine neuere Wartung angelegt wurde.
      const latestMaintenanceByVehicle = new Map<number, any>()
      for (const maintenance of maintenanceResult.data || []) {
        const vehicleId = Number(maintenance.fahrzeug_id)
        if (!vehicleId || latestMaintenanceByVehicle.has(vehicleId)) continue
        latestMaintenanceByVehicle.set(vehicleId, maintenance)
      }

      for (const maintenance of latestMaintenanceByVehicle.values()) {
        // Eine erledigte Wartung ist selbst keine offene Warnung.
        // Gewarnt wird nur anhand der hinterlegten nächsten Wartung.
        if (String(maintenance.status || "Offen") === "Erledigt" &&
            !maintenance.naechste_wartung_datum &&
            maintenance.naechste_wartung_km == null) {
          continue
        }

        if (
          maintenance.naechste_wartung_datum &&
          maintenance.naechste_wartung_datum <= today
        ) {
          warnings.push({
            id: `maintenance-date-${maintenance.id}`,
            priority: "dringend",
            icon: "🔧",
            title: `Wartung fällig – ${maintenance.kennzeichen || vehicleMap.get(Number(maintenance.fahrzeug_id))?.kennzeichen || "Fahrzeug"}`,
            detail: `${maintenance.wartungsart} · fällig seit ${maintenance.naechste_wartung_datum}`,
            page: "fleet",
          })
        } else if (
          maintenance.naechste_wartung_datum &&
          maintenance.naechste_wartung_datum <= soon
        ) {
          warnings.push({
            id: `maintenance-soon-${maintenance.id}`,
            priority: "wichtig",
            icon: "🔧",
            title: `Wartung bald fällig – ${maintenance.kennzeichen || vehicleMap.get(Number(maintenance.fahrzeug_id))?.kennzeichen || "Fahrzeug"}`,
            detail: `${maintenance.wartungsart} · ${maintenance.naechste_wartung_datum}`,
            page: "fleet",
          })
        }

        const vehicle = vehicleMap.get(Number(maintenance.fahrzeug_id))
        if (
          maintenance.naechste_wartung_km != null &&
          vehicle?.kilometerstand != null &&
          Number(vehicle.kilometerstand) >= Number(maintenance.naechste_wartung_km)
        ) {
          warnings.push({
            id: `maintenance-km-${maintenance.id}`,
            priority: "dringend",
            icon: "🔧",
            title: `Kilometer-Wartung fällig – ${vehicle.kennzeichen || "Fahrzeug"}`,
            detail: `${vehicle.kilometerstand} km · Wartung bei ${maintenance.naechste_wartung_km} km`,
            page: "fleet",
          })
        }
      }

      for (const defect of defectsResult.data || []) {
        const priority = String(defect.prioritaet || "").toLowerCase()
        if (priority === "dringend") {
          warnings.push({
            id: `defect-${defect.id}`,
            priority: "dringend",
            icon: "⚠️",
            title: `Dringender Mangel – ${defect.kennzeichen || "Fahrzeug"}`,
            detail: `${defect.kategorie} · ${defect.beschreibung}`,
            page: "defect",
          })
        } else if (priority === "wichtig") {
          warnings.push({
            id: `defect-${defect.id}`,
            priority: "wichtig",
            icon: "⚠️",
            title: `Wichtiger Mangel – ${defect.kennzeichen || "Fahrzeug"}`,
            detail: `${defect.kategorie} · ${defect.beschreibung}`,
            page: "defect",
          })
        }
      }

      for (const driver of driversResult.data || []) {
        const expiry = driver.fuehrerschein_gueltig_bis
        if (!expiry) continue
        if (expiry < today) {
          warnings.push({
            id: `license-expired-${driver.id}`,
            priority: "dringend",
            icon: "👤",
            title: `Führerschein abgelaufen – ${driver.name || driver.email}`,
            detail: `Gültig bis ${expiry}`,
            page: "driver-management",
          })
        } else if (expiry <= soon) {
          warnings.push({
            id: `license-soon-${driver.id}`,
            priority: "wichtig",
            icon: "👤",
            title: `Führerschein läuft bald ab – ${driver.name || driver.email}`,
            detail: `Gültig bis ${expiry}`,
            page: "driver-management",
          })
        }
      }

      const futureTourIds = (toursResult.data || []).map((tour: any) => Number(tour.id))
      if (futureTourIds.length > 0) {
        const { data: deliveries, error: deliveriesError } = await supabase
          .from("lieferungen")
          .select("id, tour_id, kundename, geplante_zeit, ankunftszeit, status, puenktlichkeit")

        if (deliveriesError) throw deliveriesError

        const tourMap = new Map(
          (toursResult.data || []).map((tour: any) => [Number(tour.id), tour])
        )

        for (const delivery of deliveries || []) {
          const tour = tourMap.get(Number(delivery.tour_id))
          if (!tour || !delivery.geplante_zeit || String(delivery.status || "") === "Erledigt") {
            continue
          }

          const planned = normalizeTime(delivery.geplante_zeit)
          if (!planned) continue

          const plannedDateTime = new Date(`${tour.datum}T${planned}:00`)
          if (Number.isNaN(plannedDateTime.getTime())) continue

          if (plannedDateTime.getTime() < now.getTime()) {
            warnings.push({
              id: `delivery-delay-${delivery.id}`,
              priority: "dringend",
              icon: "🚚",
              title: `Verspätete Lieferung – ${tour.tournummer}`,
              detail: `${delivery.kundename} · geplant ${planned} Uhr`,
              page: "dispatcher",
            })
          }
        }
      }

      const priorityOrder = { dringend: 0, wichtig: 1, hinweis: 2 }
      warnings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

      setCentralWarnings(warnings)
    } catch (error: any) {
      console.error("Fehler beim Laden der zentralen Warnungen:", error)
      setWarningsError(error?.message || "Warnungen konnten nicht geladen werden.")
      setCentralWarnings([])
    } finally {
      setWarningsLoading(false)
    }
  }

  async function loadDashboardStats() {
    setDashboardLoading(true)
    setDashboardError("")

    const today = getToday()

    const {
      data: todayToursData,
      error: toursError,
    } = await supabase
      .from("touren")
      .select(
        "id, status"
      )
      .eq("datum", today)

    if (toursError) {
      console.error(
        "Fehler beim Laden der Dashboard-Touren:",
        toursError
      )

      setDashboardError(
        toursError.message
      )
      setDashboardLoading(false)
      return
    }

    const todayTourIds =
      (todayToursData || []).map(
        (row) => Number(row.id)
      )

    if (todayTourIds.length === 0) {
      setDashboardStats({
        toursToday: 0,
        deliveriesToday: 0,
        completedToday: 0,
        openToday: 0,
        delayedToday: 0,
      })
      setDashboardLoading(false)
      return
    }

    const {
      data: todayDeliveriesData,
      error: deliveriesError,
    } = await supabase
      .from("lieferungen")
      .select(
        `
          id,
          tour_id,
          status,
          geplante_zeit,
          ankunftszeit,
          puenktlichkeit
        `
      )
      .in(
        "tour_id",
        todayTourIds
      )

    if (deliveriesError) {
      console.error(
        "Fehler beim Laden der Dashboard-Lieferungen:",
        deliveriesError
      )

      setDashboardError(
        deliveriesError.message
      )
      setDashboardLoading(false)
      return
    }

    const todayDeliveries =
      todayDeliveriesData || []

    const completedToday =
      todayDeliveries.filter(
        (delivery) =>
          String(
            delivery.status || ""
          ) === "Erledigt"
      ).length

    const openToday =
      todayDeliveries.length -
      completedToday

    const now = new Date()
    const currentMinutes =
      now.getHours() * 60 +
      now.getMinutes()

    const delayedToday =
      todayDeliveries.filter(
        (delivery) => {
          const punctuality =
            String(
              delivery.puenktlichkeit ||
                ""
            ).toLowerCase()

          if (
            punctuality.includes(
              "verspätet"
            )
          ) {
            return true
          }

          if (
            String(
              delivery.status || ""
            ) === "Erledigt"
          ) {
            return false
          }

          const planned =
            normalizeTime(
              delivery.geplante_zeit
            )

          if (!planned) {
            return false
          }

          const parts =
            planned.split(":")

          const plannedMinutes =
            Number(parts[0]) * 60 +
            Number(parts[1])

          return (
            plannedMinutes <
            currentMinutes
          )
        }
      ).length

    setDashboardStats({
      toursToday:
        todayToursData?.length || 0,
      deliveriesToday:
        todayDeliveries.length,
      completedToday,
      openToday,
      delayedToday,
    })

    setDashboardLoading(false)
  }

  useEffect(() => {
    if (!session || !currentUser) return
    loadTours()
    loadDashboardStats()
    loadCentralWarnings()
  }, [session, currentUser?.id, currentUser?.rolle])

  useEffect(() => {
    if (!session || !currentUser || currentUser.rolle !== "Fahrer") return
    loadDriverShift()
  }, [session, currentUser?.id, currentUser?.rolle])

  useEffect(() => {
    if (currentUser?.rolle !== "Fahrer" || page !== "dashboard") return
    loadDriverShift()
  }, [page])

  useEffect(() => {
    if (!driverShift || currentUser?.rolle !== "Fahrer") return
    const currentSegment = [...driverShiftSegments].reverse().find((item) => !item.endzeit)
    if (currentSegment) {
      setShiftVehicleId(String(currentSegment.fahrzeug_id))
    }
  }, [driverShift?.id, driverShiftSegments.length])

  // =====================================================
  // PUNKT 13/14 – FAHRER & ARBEITSZEIT / KILOMETER
  // =====================================================

  async function loadDriverProfiles() {
    if (!canManageTours) return
    setDriverProfileLoading(true)
    const { data, error } = await supabase
      .from("benutzer")
      .select("id,email,name,rolle,aktiv,freigabestatus,telefon,fuehrerscheinnummer,fuehrerschein_gueltig_bis")
      .eq("rolle", "Fahrer")
      .order("name")
    if (error) {
      setDriverProfileError(error.message)
      setDriverProfiles([])
    } else {
      setDriverProfiles((data || []).map((row: any) => ({
        id: String(row.id),
        email: String(row.email || ""),
        name: String(row.name || ""),
        rolle: "Fahrer",
        aktiv: Boolean(row.aktiv),
        freigabestatus:
          row.freigabestatus === "Freigegeben"
            ? "Freigegeben"
            : row.freigabestatus === "Gesperrt"
              ? "Gesperrt"
              : "Ausstehend",
        berechtigungen: [],
        telefon: String(row.telefon || ""),
        fuehrerscheinnummer: String(row.fuehrerscheinnummer || ""),
        fuehrerschein_gueltig_bis: String(row.fuehrerschein_gueltig_bis || ""),
      })))
    }
    setDriverProfileLoading(false)
  }

  async function saveDriverProfile() {
    if (!driverEdit) return
    const { error } = await supabase.from("benutzer").update({
      name: driverEdit.name,
      aktiv: driverEdit.aktiv,
      telefon: driverEdit.telefon || null,
      fuehrerscheinnummer: driverEdit.fuehrerscheinnummer || null,
      fuehrerschein_gueltig_bis: driverEdit.fuehrerschein_gueltig_bis || null,
    }).eq("id", driverEdit.id)
    if (error) { setDriverProfileError(error.message); return }
    setDriverProfileMessage("Fahrerdaten gespeichert.")
    setDriverEdit(null)
    await loadDriverProfiles()
    await loadTours()
  }

  async function loadWorkEntries() {
    if (!canManageTours) return
    setWorkLoading(true)
    const { data, error } = await supabase
      .from("fahrer_arbeitszeiten")
      .select("id,fahrer_id,datum,arbeitsbeginn,arbeitsende,pause_minuten,notiz")
      .order("datum", { ascending: false })
      .order("arbeitsbeginn", { ascending: false })
      .limit(200)
    if (error) setWorkMessage(error.message)
    else setWorkEntries((data || []) as WorkEntry[])
    setWorkLoading(false)
  }

  async function loadDriverShift() {
    if (!currentUser?.id || currentUser.rolle !== "Fahrer") return

    setDriverShiftLoading(true)
    setDriverShiftMessage("")

    const { data: shiftRows, error: shiftError } = await supabase
      .from("schichten")
      .select("id,fahrer_id,startzeit,endzeit,status,gesamt_km,notiz")
      .eq("fahrer_id", currentUser.id)
      .eq("status", "Offen")
      .order("startzeit", { ascending: false })
      .limit(1)

    if (shiftError) {
      setDriverShiftMessage("Schicht konnte nicht geladen werden: " + shiftError.message)
      setDriverShiftLoading(false)
      return
    }

    const activeShift = (shiftRows || [])[0] as DriverShift | undefined

    if (!activeShift) {
      setDriverShift(null)
      setDriverShiftSegments([])
      setShiftVehicleId("")
      setShiftKm("")
      setShiftEndKm("")
      setDriverShiftLoading(false)
      return
    }

    setDriverShift(activeShift)

    const { data: segmentRows, error: segmentError } = await supabase
      .from("schicht_fahrzeuge")
      .select("id,schicht_id,fahrzeug_id,startzeit,endzeit,start_km,end_km,gefahrene_km")
      .eq("schicht_id", activeShift.id)
      .order("startzeit", { ascending: true })

    if (segmentError) {
      setDriverShiftMessage("Fahrzeugabschnitte konnten nicht geladen werden: " + segmentError.message)
      setDriverShiftSegments([])
    } else {
      setDriverShiftSegments((segmentRows || []) as ShiftVehicleSegment[])
      const currentSegment = [...(segmentRows || [])].reverse().find((item: any) => !item.endzeit)
      if (currentSegment) {
        setShiftVehicleId(String(currentSegment.fahrzeug_id))
        setShiftKm(String(currentSegment.start_km))
      }
    }

    setDriverShiftLoading(false)
  }

  function getShiftVehicle(vehicleId: number | string | null | undefined): Vehicle | null {
    if (vehicleId == null || vehicleId === "") return null
    return vehicles.find((item) => Number(item.id) === Number(vehicleId)) || null
  }

  function parseKmInput(value: string): number | null {
    const normalized = value.trim().replace(/\./g, "").replace(/,/g, ".")
    if (!normalized) return null
    const number = Number(normalized)
    return Number.isFinite(number) ? Math.round(number) : null
  }

  async function updateVehicleKilometerstand(vehicleId: number, kilometerstand: number) {
    const { error } = await supabase.rpc("fahrzeug_kilometerstand_setzen", {
      p_fahrzeug_id: vehicleId,
      p_kilometerstand: Math.round(kilometerstand),
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  async function startDriverShift() {
    if (!currentUser?.id || currentUser.rolle !== "Fahrer") return
    if (driverShift) {
      setDriverShiftMessage("Es läuft bereits eine Schicht.")
      return
    }

    const vehicleId = Number(shiftVehicleId)
    const startKm = parseKmInput(shiftKm)
    const selectedVehicle = getShiftVehicle(vehicleId)

    if (!selectedVehicle) {
      setDriverShiftMessage("Bitte ein Fahrzeug auswählen.")
      return
    }

    if (startKm == null || startKm < 0) {
      setDriverShiftMessage("Bitte einen gültigen Start-Kilometerstand eingeben.")
      return
    }

    const knownKm = Number(selectedVehicle.kilometerstand || 0)
    if (startKm < knownKm) {
      setDriverShiftMessage(
        `Der Start-Kilometerstand darf nicht kleiner als der aktuelle Fahrzeugstand (${knownKm.toLocaleString("de-DE")} km) sein.`
      )
      return
    }

    setDriverShiftSaving(true)
    setDriverShiftMessage("")

    const { data: shift, error: shiftError } = await supabase
      .from("schichten")
      .insert({
        fahrer_id: currentUser.id,
        status: "Offen",
        gesamt_km: 0,
      })
      .select("id,fahrer_id,startzeit,endzeit,status,gesamt_km,notiz")
      .single()

    if (shiftError || !shift) {
      setDriverShiftMessage("Schicht konnte nicht gestartet werden: " + (shiftError?.message || "Unbekannter Fehler"))
      setDriverShiftSaving(false)
      return
    }

    const { error: segmentError } = await supabase
      .from("schicht_fahrzeuge")
      .insert({
        schicht_id: shift.id,
        fahrzeug_id: vehicleId,
        start_km: startKm,
      })

    if (segmentError) {
      await supabase.from("schichten").delete().eq("id", shift.id)
      setDriverShiftMessage("Fahrzeugabschnitt konnte nicht gestartet werden: " + segmentError.message)
      setDriverShiftSaving(false)
      return
    }

    try {
      await updateVehicleKilometerstand(vehicleId, startKm)
    } catch (error) {
      await supabase.from("schicht_fahrzeuge").delete().eq("schicht_id", shift.id)
      await supabase.from("schichten").delete().eq("id", shift.id)
      setDriverShiftMessage("Fahrzeugkilometer konnten nicht gespeichert werden: " + (error instanceof Error ? error.message : String(error)))
      setDriverShiftSaving(false)
      return
    }

    setDriverShift(shift as DriverShift)
    setDriverShiftSegments([{
      id: 0,
      schicht_id: Number(shift.id),
      fahrzeug_id: vehicleId,
      startzeit: String(shift.startzeit),
      endzeit: null,
      start_km: startKm,
      end_km: null,
      gefahrene_km: null,
    }])
    setShiftEndKm("")
    setShiftChangeVehicleId("")
    setShiftChangeEndKm("")
    setShiftChangeStartKm("")
    await loadVehicles()
    setDriverShiftSaving(false)
  }

  async function changeDriverShiftVehicle() {
    if (!driverShift || !currentUser?.id) return

    const currentSegment = [...driverShiftSegments].reverse().find((item) => !item.endzeit)
    if (!currentSegment) {
      setDriverShiftMessage("Es wurde kein aktives Fahrzeug gefunden.")
      return
    }

    const endKm = parseKmInput(shiftChangeEndKm)
    const nextVehicleId = Number(shiftChangeVehicleId)
    const nextVehicle = getShiftVehicle(nextVehicleId)

    if (endKm == null || endKm < currentSegment.start_km) {
      setDriverShiftMessage("Der End-Kilometerstand muss gültig und mindestens so hoch wie der Startstand sein.")
      return
    }

    if (!nextVehicle) {
      setDriverShiftMessage("Bitte das neue Fahrzeug auswählen.")
      return
    }

    if (nextVehicleId === currentSegment.fahrzeug_id) {
      setDriverShiftMessage("Bitte ein anderes Fahrzeug auswählen.")
      return
    }

    const nextKnownKm = Number(nextVehicle.kilometerstand || 0)
    const nextStartKm = parseKmInput(shiftChangeStartKm)
    if (nextStartKm == null) {
      setDriverShiftMessage("Bitte einen Start-Kilometerstand für das neue Fahrzeug eingeben.")
      return
    }

    setDriverShiftSaving(true)
    setDriverShiftMessage("")

    const drivenKm = endKm - currentSegment.start_km

    const { error: closeError } = await supabase
      .from("schicht_fahrzeuge")
      .update({
        endzeit: new Date().toISOString(),
        end_km: endKm,
        gefahrene_km: drivenKm,
      })
      .eq("id", currentSegment.id)

    if (closeError) {
      setDriverShiftMessage("Der aktuelle Fahrzeugabschnitt konnte nicht abgeschlossen werden: " + closeError.message)
      setDriverShiftSaving(false)
      return
    }

    try {
      await updateVehicleKilometerstand(currentSegment.fahrzeug_id, endKm)
    } catch (error) {
      setDriverShiftMessage("Der Kilometerstand des bisherigen Fahrzeugs konnte nicht aktualisiert werden: " + (error instanceof Error ? error.message : String(error)))
      setDriverShiftSaving(false)
      return
    }

    if (nextStartKm < nextKnownKm) {
      setDriverShiftMessage(
        `Das neue Fahrzeug hat bereits ${nextKnownKm.toLocaleString("de-DE")} km. Der Startstand darf nicht darunter liegen.`
      )
      setDriverShiftSaving(false)
      return
    }

    const { data: newSegment, error: newSegmentError } = await supabase
      .from("schicht_fahrzeuge")
      .insert({
        schicht_id: driverShift.id,
        fahrzeug_id: nextVehicleId,
        start_km: nextStartKm,
      })
      .select("id,schicht_id,fahrzeug_id,startzeit,endzeit,start_km,end_km,gefahrene_km")
      .single()

    if (newSegmentError || !newSegment) {
      setDriverShiftMessage("Das neue Fahrzeug konnte nicht übernommen werden: " + (newSegmentError?.message || "Unbekannter Fehler"))
      setDriverShiftSaving(false)
      return
    }

    try {
      await updateVehicleKilometerstand(nextVehicleId, nextStartKm)
    } catch (error) {
      setDriverShiftMessage("Der Kilometerstand des neuen Fahrzeugs konnte nicht gespeichert werden: " + (error instanceof Error ? error.message : String(error)))
      setDriverShiftSaving(false)
      return
    }

    const newTotal = Number(driverShift.gesamt_km || 0) + drivenKm
    await supabase.from("schichten").update({ gesamt_km: newTotal }).eq("id", driverShift.id)

    setDriverShift({
      ...driverShift,
      gesamt_km: newTotal,
    })
    setDriverShiftSegments((old) => [
      ...old.map((item) =>
        item.id === currentSegment.id
          ? { ...item, endzeit: new Date().toISOString(), end_km: endKm, gefahrene_km: drivenKm }
          : item
      ),
      newSegment as ShiftVehicleSegment,
    ])
    setShiftVehicleId(String(nextVehicleId))
    setShiftKm(String(nextStartKm))
    setShiftChangeVehicleId("")
    setShiftChangeEndKm("")
    setShiftChangeStartKm("")
    setShiftChangeOpen(false)
    await loadVehicles()
    setDriverShiftSaving(false)
  }

  async function endDriverShift() {
    if (!driverShift || !currentUser?.id) return

    const currentSegment = [...driverShiftSegments].reverse().find((item) => !item.endzeit)
    if (!currentSegment) {
      setDriverShiftMessage("Es wurde kein aktives Fahrzeug gefunden.")
      return
    }

    const endKm = parseKmInput(shiftEndKm)
    if (endKm == null || endKm < currentSegment.start_km) {
      setDriverShiftMessage("Der End-Kilometerstand muss gültig und mindestens so hoch wie der Startstand sein.")
      return
    }

    setDriverShiftSaving(true)
    setDriverShiftMessage("")

    const drivenKm = endKm - currentSegment.start_km
    const totalKm = Number(driverShift.gesamt_km || 0) + drivenKm

    const { error: segmentError } = await supabase
      .from("schicht_fahrzeuge")
      .update({
        endzeit: new Date().toISOString(),
        end_km: endKm,
        gefahrene_km: drivenKm,
      })
      .eq("id", currentSegment.id)

    if (segmentError) {
      setDriverShiftMessage("Der Fahrzeugabschnitt konnte nicht beendet werden: " + segmentError.message)
      setDriverShiftSaving(false)
      return
    }

    try {
      await updateVehicleKilometerstand(currentSegment.fahrzeug_id, endKm)
    } catch (error) {
      setDriverShiftMessage("Der Fahrzeugkilometerstand konnte nicht aktualisiert werden: " + (error instanceof Error ? error.message : String(error)))
      setDriverShiftSaving(false)
      return
    }

    const { error: shiftError } = await supabase
      .from("schichten")
      .update({
        endzeit: new Date().toISOString(),
        status: "Abgeschlossen",
        gesamt_km: totalKm,
      })
      .eq("id", driverShift.id)

    if (shiftError) {
      setDriverShiftMessage("Die Schicht konnte nicht abgeschlossen werden: " + shiftError.message)
      setDriverShiftSaving(false)
      return
    }

    setDriverShiftMessage(`Schicht beendet. Heute gefahren: ${totalKm.toLocaleString("de-DE")} km.`)
    setDriverShift(null)
    setDriverShiftSegments([])
    setShiftEndKm("")
    setShiftChangeVehicleId("")
    setShiftChangeEndKm("")
    setShiftChangeStartKm("")
    await loadVehicles()
    setDriverShiftSaving(false)
  }

  function formatShiftDuration(startzeit: string, endzeit?: string | null) {
    const start = new Date(startzeit).getTime()
    const end = endzeit ? new Date(endzeit).getTime() : Date.now()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—"
    const minutes = Math.floor((end - start) / 60000)
    return formatMinutes(minutes)
  }

  function formatShiftDateTime(value: string | null | undefined) {
    if (!value) return "—"
    return new Date(value).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  async function saveWorkEntry() {
    if (!workDriverId || !workDate || !workStart) {
      setWorkMessage("Bitte Fahrer, Datum und Arbeitsbeginn eingeben.")
      return
    }
    const { error } = await supabase.from("fahrer_arbeitszeiten").insert({
      fahrer_id: workDriverId,
      datum: workDate,
      arbeitsbeginn: workStart,
      arbeitsende: workEnd || null,
      pause_minuten: Number(workBreak || 0),
      notiz: workNote || null,
    })
    if (error) { setWorkMessage(error.message); return }
    setWorkMessage("Arbeitszeit gespeichert.")
    setWorkStart(""); setWorkEnd(""); setWorkNote("")
    await loadWorkEntries()
  }

  function workMinutes(entry: WorkEntry) {
    if (!entry.arbeitsbeginn || !entry.arbeitsende) return 0
    const [sh, sm] = entry.arbeitsbeginn.slice(0,5).split(":").map(Number)
    const [eh, em] = entry.arbeitsende.slice(0,5).split(":").map(Number)
    let minutes = eh * 60 + em - (sh * 60 + sm)
    if (minutes < 0) minutes += 1440
    return Math.max(0, minutes - Number(entry.pause_minuten || 0))
  }

  function formatMinutes(total: number) {
    return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")} min`
  }

  async function loadDriverStats() {
    if (!canManageTours) return
    const { data: tourRows } = await supabase.from("touren").select("id,fahrer_id,km_start,km_ende")
    const ids = (tourRows || []).map((r: any) => Number(r.id))
    const { data: deliveryRows } = ids.length
      ? await supabase.from("lieferungen").select("tour_id,status,puenktlichkeit").in("tour_id", ids)
      : { data: [] as any[] }
    const result: Record<string, DriverTourStats> = {}
    ;(tourRows || []).forEach((row: any) => {
      if (!row.fahrer_id) return
      const key = String(row.fahrer_id)
      const existing = result[key] || { touren: 0, erledigteTouren: 0, lieferungen: 0, erledigteLieferungen: 0, verspaeteteLieferungen: 0, kilometer: 0 }
      existing.touren += 1
      if (row.km_start != null && row.km_ende != null && Number(row.km_ende) >= Number(row.km_start)) existing.kilometer += Number(row.km_ende) - Number(row.km_start)
      const ds = (deliveryRows || []).filter((d: any) => Number(d.tour_id) === Number(row.id))
      existing.lieferungen += ds.length
      existing.erledigteLieferungen += ds.filter((d: any) => String(d.status || "").toLowerCase() === "erledigt").length
      existing.verspaeteteLieferungen += ds.filter((d: any) => String(d.puenktlichkeit || "").toLowerCase().includes("verspätet")).length
      result[key] = existing
    })
    Object.keys(result).forEach((key) => {
      result[key].erledigteTouren = (tourRows || []).filter((r: any) => String(r.fahrer_id) === key).filter((r: any) => {
        const ds = (deliveryRows || []).filter((d: any) => Number(d.tour_id) === Number(r.id))
        return ds.length > 0 && ds.every((d: any) => String(d.status || "").toLowerCase() === "erledigt")
      }).length
    })
    setDriverStats(result)
  }

  async function loadReportData() {
    if (!currentUser) return
    setReportLoading(true)
    setReportError("")

    const driverId = currentUser.rolle === "Fahrer" ? currentUser.id : reportDriverId
    let query = supabase
      .from("touren")
      .select("id,tournummer,datum,fahrer_id,fahrer,km_start,km_ende,status")
      .gte("datum", reportStart)
      .lte("datum", reportEnd)
      .order("datum", { ascending: false })

    if (driverId) query = query.eq("fahrer_id", driverId)

    const { data: tourRows, error: tourError } = await query
    if (tourError) {
      setReportError(tourError.message)
      setReportLoading(false)
      return
    }

    const ids = (tourRows || []).map((row: any) => Number(row.id))
    const { data: deliveryRows, error: deliveryError } = ids.length
      ? await supabase.from("lieferungen").select("tour_id,status,puenktlichkeit").in("tour_id", ids)
      : { data: [] as any[], error: null }

    if (deliveryError) {
      setReportError(deliveryError.message)
      setReportLoading(false)
      return
    }

    let workQuery = supabase
      .from("fahrer_arbeitszeiten")
      .select("id,fahrer_id,datum,arbeitsbeginn,arbeitsende,pause_minuten,notiz")
      .gte("datum", reportStart)
      .lte("datum", reportEnd)

    if (driverId) workQuery = workQuery.eq("fahrer_id", driverId)

    const { data: workRows, error: workError } = await workQuery.order("datum", { ascending: false })
    if (workError) {
      setReportError(workError.message)
      setReportLoading(false)
      return
    }

    const tours = tourRows || []
    const deliveries = deliveryRows || []
    const completedTours = tours.filter((t: any) => {
      const status = String(t.status || "").toLowerCase()
      if (["erledigt", "abgeschlossen"].includes(status)) return true
      const ds = deliveries.filter((d: any) => Number(d.tour_id) === Number(t.id))
      return ds.length > 0 && ds.every((d: any) => String(d.status || "").toLowerCase() === "erledigt")
    }).length
    const kilometers = tours.reduce((sum: number, t: any) => {
      if (t.km_start != null && t.km_ende != null && Number(t.km_ende) >= Number(t.km_start)) {
        return sum + Number(t.km_ende) - Number(t.km_start)
      }
      return sum
    }, 0)
    const completedDeliveries = deliveries.filter((d: any) => String(d.status || "").toLowerCase() === "erledigt").length
    const delayedDeliveries = deliveries.filter((d: any) => String(d.puenktlichkeit || "").toLowerCase().includes("verspätet")).length
    const workMinutesTotal = (workRows || []).reduce((sum: number, row: any) => sum + workMinutes(row as WorkEntry), 0)

    setReportTourRows(tours)
    setReportStats({
      tours: tours.length,
      completedTours,
      deliveries: deliveries.length,
      completedDeliveries,
      delayedDeliveries,
      kilometers,
      workMinutes: workMinutesTotal,
    })
    setReportLoading(false)
  }

  function getReportDriverLabel(): string {
    if (currentUser?.rolle === "Fahrer") {
      return currentUser.name || currentUser.email || "Eigener Bericht"
    }
    if (reportDriverId) {
      const driver = driverProfiles.find((item) => item.id === reportDriverId)
      return driver?.name || driver?.email || "Ausgewählter Fahrer"
    }
    return "Alle Fahrer"
  }

  function reportFileBaseName(): string {
    return `TransportApp_Bericht_${reportStart}_${reportEnd}`
  }

  function escapeCsv(value: unknown): string {
    const text = String(value ?? "")
    return `"${text.replace(/"/g, '""')}"`
  }

  function downloadReportCsv() {
    const rows = reportTourRows || []
    const header = [
      "Tournummer",
      "Datum",
      "Fahrer",
      "Status",
      "Startkilometer",
      "Endkilometer",
      "Gefahrene Kilometer",
    ]

    const csvRows = rows.map((tour: any) => {
      const start = tour.km_start != null ? Number(tour.km_start) : ""
      const end = tour.km_ende != null ? Number(tour.km_ende) : ""
      const km = start !== "" && end !== "" && end >= start ? end - start : ""
      return [
        tour.tournummer,
        formatTourDate(tour.datum),
        tour.fahrer || "",
        tour.status || "",
        start,
        end,
        km,
      ].map(escapeCsv).join(";")
    })

    const summary = [
      ["Zeitraum", `${reportStart} bis ${reportEnd}`],
      ["Fahrer", getReportDriverLabel()],
      ["Touren", reportStats.tours],
      ["Abgeschlossene Touren", reportStats.completedTours],
      ["Lieferungen", reportStats.deliveries],
      ["Erledigte Lieferungen", reportStats.completedDeliveries],
      ["Verspätete Lieferungen", reportStats.delayedDeliveries],
      ["Kilometer", reportStats.kilometers],
      ["Arbeitszeit Minuten", reportStats.workMinutes],
    ].map(([label, value]) => `${escapeCsv(label)};${escapeCsv(value)}`)

    const content = [
      "TransportApp – Bericht",
      "",
      ...summary,
      "",
      header.map(escapeCsv).join(";"),
      ...csvRows,
    ].join("\r\n")

    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${reportFileBaseName()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function downloadReportPdf() {
    const doc = new jsPDF()
    const margin = 14
    let y = 18

    doc.setFontSize(18)
    doc.text("TransportApp – Bericht", margin, y)
    y += 9
    doc.setFontSize(10)
    doc.text(`Zeitraum: ${reportStart} bis ${reportEnd}`, margin, y)
    y += 6
    doc.text(`Fahrer: ${getReportDriverLabel()}`, margin, y)
    y += 10

    const summaryLines = [
      `Touren: ${reportStats.tours}`,
      `Abgeschlossene Touren: ${reportStats.completedTours}`,
      `Lieferungen: ${reportStats.deliveries}`,
      `Erledigte Lieferungen: ${reportStats.completedDeliveries}`,
      `Verspätete Lieferungen: ${reportStats.delayedDeliveries}`,
      `Kilometer: ${reportStats.kilometers} km`,
      `Arbeitszeit: ${formatMinutes(reportStats.workMinutes)}`,
    ]

    doc.setFontSize(11)
    summaryLines.forEach((line) => {
      doc.text(line, margin, y)
      y += 6
    })

    y += 4
    doc.setFontSize(13)
    doc.text("Touren im Zeitraum", margin, y)
    y += 8
    doc.setFontSize(9)

    const drawHeader = () => {
      doc.setFont("helvetica", "bold")
      doc.text("Tour", margin, y)
      doc.text("Datum", margin + 30, y)
      doc.text("Fahrer", margin + 58, y)
      doc.text("Status", margin + 112, y)
      doc.text("KM", margin + 158, y)
      doc.setFont("helvetica", "normal")
      y += 5
    }

    drawHeader()

    ;(reportTourRows || []).forEach((tour: any) => {
      if (y > 280) {
        doc.addPage()
        y = 18
        drawHeader()
      }
      const start = tour.km_start != null ? Number(tour.km_start) : null
      const end = tour.km_ende != null ? Number(tour.km_ende) : null
      const km = start != null && end != null && end >= start ? end - start : null
      doc.text(String(tour.tournummer || ""), margin, y)
      doc.text(formatTourDate(tour.datum), margin + 30, y)
      doc.text(String(tour.fahrer || "-").slice(0, 28), margin + 58, y)
      doc.text(String(tour.status || "Offen").slice(0, 20), margin + 112, y)
      doc.text(km != null ? `${km}` : "-", margin + 158, y)
      y += 5
    })

    doc.save(`${reportFileBaseName()}.pdf`)
  }

  // =====================================================
  // TOUR AUSWÄHLEN
  // =====================================================

  async function selectTour(
    tourId: number
  ) {
    const selected =
      tours.find(
        (item) => item.id === tourId
      ) || null

    setSelectedTourId(tourId)
    setTour(selected)
    setActiveDelivery(null)
    setDeliveryMessage("")
    setTourError("")

    await loadDeliveries(tourId)
  }

  // =====================================================
  // LIEFERUNG AKTUALISIEREN
  // =====================================================

  async function updateDelivery(
    id: number,
    changes: Record<string, unknown>
  ): Promise<boolean> {
    setDeliverySaving(true)

    const { error } = await supabase
      .from("lieferungen")
      .update(changes)
      .eq("id", id)

    setDeliverySaving(false)

    if (error) {
      console.error(
        "Fehler beim Speichern der Lieferung:",
        error
      )

      alert(
        "Die Änderung konnte nicht gespeichert werden:\n\n" +
          error.message
      )

      return false
    }

    return true
  }

  async function changeDeliveryStatus(
    id: number,
    status: Delivery["status"]
  ) {
    const delivery = deliveries.find((item) => item.id === id)
    if (!delivery) return

    if (currentUser?.rolle === "Fahrer") {
      const nextId = getNextDeliveryId(deliveries)
      if (nextId !== id) {
        alert("Bitte zuerst den nächsten Stopp bearbeiten.")
        return
      }

      const allowed =
        (delivery.status === "Offen" && status === "Unterwegs") ||
        (delivery.status === "Unterwegs" && status === "Beim Kunden")

      if (!allowed && status !== delivery.status) {
        alert("Bitte den Lieferablauf Schritt für Schritt durchführen.")
        return
      }
    }

    const changes: Record<string, unknown> = {
      status,
    }

    if (status === "Offen") {
      changes.ankunftszeit = null
      changes.angeliefert_zeit = null
      changes.abfahrtszeit = null
      changes.puenktlichkeit = null
    }

    const success =
      await updateDelivery(id, changes)

    if (!success) {
      return
    }

    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              status,
              ...(status === "Offen"
                ? {
                    arrivalTime: undefined,
                    deliveredTime: undefined,
                    departureTime: undefined,
                    punctuality: undefined,
                  }
                : {}),
            }
          : delivery
      )
    )

    if (status === "Unterwegs" || status === "Beim Kunden") {
      setActiveDelivery(id)
    } else {
      setActiveDelivery(null)
    }

    // Auch wenn der Status über einen direkten Statuswechsel auf „Erledigt“
    // gesetzt wurde, prüfen wir sofort den automatischen Tourabschluss.
    if (status === "Erledigt" && tour?.id != null) {
      await synchronizeTourCompletion(tour.id)
    }

    setDeliveryMessage(
      `Status der Lieferung wurde auf „${status}“ geändert.`
    )
  }

  async function startDelivery(id: number) {
    const delivery = deliveries.find((item) => item.id === id)
    if (!delivery) return
    if (currentUser?.rolle === "Fahrer" && getNextDeliveryId(deliveries) !== id) {
      alert("Bitte zuerst den nächsten Stopp bearbeiten.")
      return
    }
    if (delivery.status !== "Offen") return

    const success =
      await updateDelivery(id, {
        status: "Unterwegs",
      })

    if (!success) {
      return
    }

    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              status: "Unterwegs",
            }
          : delivery
      )
    )

    setActiveDelivery(id)
    setDeliveryMessage("")
  }

  async function arriveAtCustomer(
    id: number
  ) {
    const currentDelivery = deliveries.find((item) => item.id === id)
    if (!currentDelivery) return
    if (currentDelivery.status !== "Unterwegs") {
      alert("Bitte zuerst die Fahrt zur Lieferung starten.")
      return
    }

    const currentTime =
      getCurrentTime()

    const delivery =
      deliveries.find(
        (item) => item.id === id
      )

    if (!delivery) {
      return
    }

    const punctuality =
      calculatePunctuality(
        delivery.plannedTime,
        currentTime
      )

    const success =
      await updateDelivery(id, {
        status: "Beim Kunden",
        ankunftszeit: currentTime,
        puenktlichkeit: punctuality,
      })

    if (!success) {
      return
    }

    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              status: "Beim Kunden",
              arrivalTime: currentTime,
              punctuality,
            }
          : delivery
      )
    )

    setActiveDelivery(id)
  }

  async function setManualArrivalTime(
    id: number,
    time: string
  ) {
    const delivery =
      deliveries.find(
        (item) => item.id === id
      )

    if (!delivery) {
      return
    }

    if (!time) {
      const success =
        await updateDelivery(id, {
          ankunftszeit: null,
          puenktlichkeit: null,
        })

      if (!success) {
        return
      }

      setDeliveries((old) =>
        old.map((delivery) =>
          delivery.id === id
            ? {
                ...delivery,
                arrivalTime: undefined,
                punctuality: undefined,
              }
            : delivery
        )
      )

      return
    }

    const punctuality =
      calculatePunctuality(
        delivery.plannedTime,
        time
      )

    const success =
      await updateDelivery(id, {
        status: "Beim Kunden",
        ankunftszeit: time,
        puenktlichkeit: punctuality,
      })

    if (!success) {
      return
    }

    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              arrivalTime: time,
              status: "Beim Kunden",
              punctuality,
            }
          : delivery
      )
    )

    setActiveDelivery(id)
  }

  async function setDeliveredTime(
    id: number,
    time: string
  ) {
    const delivery = deliveries.find((item) => item.id === id)
    if (!delivery || delivery.status !== "Beim Kunden" || !delivery.arrivalTime) {
      alert("Bitte zuerst die Ankunft beim Kunden erfassen.")
      return
    }

    const success =
      await updateDelivery(id, {
        angeliefert_zeit:
          time || null,
      })

    if (!success) {
      return
    }

    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              deliveredTime:
                time || undefined,
            }
          : delivery
      )
    )
  }

  async function setDepartureTime(
    id: number,
    time: string
  ) {
    const delivery = deliveries.find((item) => item.id === id)
    if (!delivery || delivery.status !== "Beim Kunden" || !delivery.deliveredTime) {
      alert("Bitte zuerst die Lieferung als angeliefert erfassen.")
      return
    }

    const success =
      await updateDelivery(id, {
        abfahrtszeit:
          time || null,
      })

    if (!success) {
      return
    }

    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              departureTime:
                time || undefined,
            }
          : delivery
      )
    )
  }

  async function setComplaint(
    id: number,
    complaint: boolean
  ) {
    const success =
      await updateDelivery(id, {
        beschwerde: complaint,
      })

    if (!success) {
      return
    }

    const updatedDelivery = deliveries.find((delivery) => delivery.id === id)

    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              complaint,
            }
          : delivery
      )
    )

    if (complaint && updatedDelivery?.kundeId) {
      const { data: existingComplaint } = await supabase
        .from("kundenbeschwerden")
        .select("id")
        .eq("lieferung_id", id)
        .limit(1)
        .maybeSingle()

      if (!existingComplaint) {
        await supabase.from("kundenbeschwerden").insert({
          kunde_id: updatedDelivery.kundeId,
          lieferung_id: id,
          beschreibung: updatedDelivery.note?.trim() || "Beschwerde gemeldet",
          status: "Offen",
          erstellt_von: session?.user?.id || null,
        })
      }
      await loadCustomers()
    }
  }

  function handleNoteChange(
    id: number,
    note: string
  ) {
    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              note,
            }
          : delivery
      )
    )
  }

  async function saveNote(
    id: number,
    note: string
  ) {
    const success =
      await updateDelivery(id, {
        notiz: note.trim() || null,
      })

    if (!success) {
      return
    }

    const updatedDelivery = deliveries.find((delivery) => delivery.id === id)

    setDeliveries((old) =>
      old.map((delivery) =>
        delivery.id === id
          ? {
              ...delivery,
              note,
            }
          : delivery
      )
    )

    if (updatedDelivery?.complaint && updatedDelivery.kundeId) {
      const { data: complaintRow } = await supabase
        .from("kundenbeschwerden")
        .select("id")
        .eq("lieferung_id", id)
        .limit(1)
        .maybeSingle()

      if (complaintRow?.id) {
        await supabase
          .from("kundenbeschwerden")
          .update({ beschreibung: note.trim() || "Beschwerde gemeldet" })
          .eq("id", complaintRow.id)
      } else {
        await supabase.from("kundenbeschwerden").insert({
          kunde_id: updatedDelivery.kundeId,
          lieferung_id: id,
          beschreibung: note.trim() || "Beschwerde gemeldet",
          status: "Offen",
          erstellt_von: session?.user?.id || null,
        })
      }
      await loadCustomers()
    }
  }

  async function synchronizeTourCompletion(tourId: number) {
    const { data, error } = await supabase
      .from("lieferungen")
      .select("id, status")
      .eq("tour_id", tourId)

    if (error) {
      console.error("Fehler bei der Tourabschluss-Prüfung:", error)
      return false
    }

    const rows = data || []
    if (rows.length === 0) return false

    const allCompleted = rows.every((row) =>
      String(row.status || "")
        .trim()
        .toLowerCase() === "erledigt"
    )

    if (!allCompleted) return false

    const { error: updateError } = await supabase
      .from("touren")
      .update({ status: "Abgeschlossen" })
      .eq("id", tourId)

    if (updateError) {
      console.error("Fehler beim automatischen Tourabschluss:", updateError)
      return false
    }

    setTours((old) =>
      old.map((item) =>
        item.id === tourId ? { ...item, status: "Abgeschlossen" } : item
      )
    )

    setTour((old) =>
      old && old.id === tourId
        ? { ...old, status: "Abgeschlossen" }
        : old
    )

    return true
  }

  async function completeDelivery(
    id: number
  ) {
    const delivery = deliveries.find(
      (item) => item.id === id
    )

    if (!delivery) {
      return
    }

    if (!delivery.arrivalTime) {
      alert(
        "Bitte zuerst die Ankunftszeit eintragen."
      )
      return
    }

    if (!delivery.deliveredTime) {
      alert(
        "Bitte zuerst die Zeit bei 'Angeliefert' eintragen."
      )
      return
    }

    if (!delivery.departureTime) {
      alert(
        "Bitte zuerst die Abfahrtszeit eintragen."
      )
      return
    }

    const success =
      await updateDelivery(id, {
        status: "Erledigt",
      })

    if (!success) {
      return
    }

    setDeliveries((old) =>
      old.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Erledigt",
            }
          : item
      )
    )

    if (tour?.id != null) {
      await synchronizeTourCompletion(tour.id)
    }

    setActiveDelivery(null)

    setDeliveryMessage(
      "Lieferung erfolgreich abgeschlossen."
    )
  }

  // =====================================================
  // TOUR ANLEGEN
  // =====================================================

  const [newTourNumber, setNewTourNumber] =
    useState("")

  const [newTourDate, setNewTourDate] =
    useState(getToday())

  const [newTourDriver, setNewTourDriver] =
    useState("")

  const [newTourDriverId, setNewTourDriverId] =
    useState("")

  const [newTourVehicleId, setNewTourVehicleId] =
    useState("")

  const [newTourStatus, setNewTourStatus] =
    useState("Offen")

  const [newDeliveries, setNewDeliveries] =
    useState<NewDelivery[]>([
      {
        customer: "",
        address: "",
        plannedTime: "",
        kundeId: null,
      },
    ])

  const [tourCreateSaving, setTourCreateSaving] =
    useState(false)

  function addNewDelivery() {
    setNewDeliveries((old) => [
      ...old,
      {
        customer: "",
        address: "",
        plannedTime: "",
        kundeId: null,
      },
    ])
  }

  function removeNewDelivery(
    index: number
  ) {
    setNewDeliveries((old) =>
      old.filter((_, i) => i !== index)
    )
  }

  function updateNewDelivery(
    index: number,
    field: keyof NewDelivery,
    value: string
  ) {
    setNewDeliveries((old) =>
      old.map((delivery, i) =>
        i === index
          ? {
              ...delivery,
              [field]: value,
            }
          : delivery
      )
    )
  }

  function resetTourForm() {
    setNewTourNumber("")
    setNewTourDate(getToday())
    setNewTourDriver("")
    setNewTourDriverId("")
    setNewTourVehicleId("")
    setNewTourStatus("Offen")
    setNewDeliveries([
      {
        customer: "",
        address: "",
        plannedTime: "",
      },
    ])
  }

  async function createTour() {
    if (!newTourNumber.trim()) {
      alert(
        "Bitte eine Tournummer eingeben."
      )
      return
    }

    if (!newTourDate) {
      alert(
        "Bitte ein Datum auswählen."
      )
      return
    }

    if (!newTourDriver.trim()) {
      alert(
        "Bitte einen Fahrer eingeben."
      )
      return
    }

    if (!newTourVehicleId) {
      alert(
        "Bitte ein Fahrzeug für diese Tour auswählen."
      )
      return
    }

    const selectedVehicleForTour = vehicles.find(
      (item) => item.id === Number(newTourVehicleId)
    )

    if (!selectedVehicleForTour) {
      alert("Das ausgewählte Fahrzeug wurde nicht gefunden.")
      return
    }

    if (!isVehicleAvailableForTour(selectedVehicleForTour)) {
      alert(
        `Das Fahrzeug ${selectedVehicleForTour.kennzeichen} ist aktuell ${getVehicleStatusLabel(selectedVehicleForTour.status).replace(/^\S+\s*/, "")}. Bitte ein verfügbares Fahrzeug auswählen.`
      )
      return
    }

    const driverConflict = tours.find(
      (item) =>
        item.datum === newTourDate &&
        Boolean(newTourDriverId) &&
        item.fahrer_id === newTourDriverId &&
        !["erledigt", "abgeschlossen"].includes(String(item.status || "").trim().toLowerCase())
    )

    if (driverConflict) {
      const continueDespiteConflict = window.confirm(
        `Hinweis: Der Fahrer ist am ${formatTourDate(newTourDate)} bereits der Tour ${driverConflict.tournummer} zugeordnet.\n\nTrotzdem neue Tour anlegen?`
      )
      if (!continueDespiteConflict) return
    }

    const validDeliveries =
      newDeliveries.filter(
        (delivery) =>
          delivery.customer.trim() &&
          delivery.address.trim() &&
          delivery.plannedTime
      )

    if (validDeliveries.length === 0) {
      alert(
        "Bitte mindestens eine vollständige Lieferung eingeben."
      )
      return
    }

    setTourCreateSaving(true)

    const {
      data: tourData,
      error: tourError,
    } = await supabase
      .from("touren")
      .insert({
        tournummer:
          newTourNumber.trim(),
        datum: newTourDate,
        fahrzeug_id:
          newTourVehicleId
            ? Number(newTourVehicleId)
            : null,
        fahrer_id:
          newTourDriverId || null,
        fahrer:
          newTourDriver.trim(),
        status:
          newTourStatus,
      })
      .select()
      .single()

    if (tourError || !tourData) {
      setTourCreateSaving(false)

      alert(
        "Die Tour konnte nicht angelegt werden:\n\n" +
          (tourError?.message ||
            "Unbekannter Fehler")
      )

      return
    }

    const deliveryRows =
      validDeliveries.map(
        (delivery) => ({
          tour_id: Number(
            tourData.id
          ),
          kundename:
            delivery.customer.trim(),
          adresse:
            delivery.address.trim(),
          kunde_id:
            delivery.kundeId || null,
          geplante_zeit:
            delivery.plannedTime,
          status: "Offen",
        })
      )

    const {
      error: deliveriesError,
    } = await supabase
      .from("lieferungen")
      .insert(deliveryRows)

    setTourCreateSaving(false)

    if (deliveriesError) {
      await supabase
        .from("touren")
        .delete()
        .eq(
          "id",
          Number(tourData.id)
        )

      alert(
        "Die Tour wurde angelegt, aber die Lieferungen konnten nicht gespeichert werden:\n\n" +
          deliveriesError.message
      )

      return
    }

    const createdTourId =
      Number(tourData.id)

    alert(
      "✓ Tour wurde erfolgreich angelegt."
    )

    resetTourForm()

    await loadTours(
      createdTourId
    )

    setPage("tour-management")
  }

  // =====================================================
  // TOUR VERWALTEN
  // =====================================================

  const [managementSaving, setManagementSaving] =
    useState(false)

  const [editingTourNumber, setEditingTourNumber] =
    useState("")

  const [editingTourDate, setEditingTourDate] =
    useState("")

  const [editingTourDriver, setEditingTourDriver] =
    useState("")

  const [editingTourDriverId, setEditingTourDriverId] =
    useState("")

  const [editingTourVehicleId, setEditingTourVehicleId] =
    useState("")

  const [editingTourStatus, setEditingTourStatus] =
    useState("Offen")

  const [editingDeliveryId, setEditingDeliveryId] =
    useState<number | null>(null)

  const [editingDeliveryCustomer, setEditingDeliveryCustomer] =
    useState("")

  const [editingDeliveryAddress, setEditingDeliveryAddress] =
    useState("")

  const [editingDeliveryTime, setEditingDeliveryTime] =
    useState("")

  const [addingManagementDelivery, setAddingManagementDelivery] =
    useState(false)

  const [managementDeliveryCustomer, setManagementDeliveryCustomer] =
    useState("")

  const [managementDeliveryAddress, setManagementDeliveryAddress] =
    useState("")

  const [managementDeliveryTime, setManagementDeliveryTime] =
    useState("")

  function loadTourIntoManagement(
    selected: Tour
  ) {
    setEditingTourNumber(
      selected.tournummer
    )
    setEditingTourDate(
      selected.datum
    )
    setEditingTourDriver(
      selected.fahrer || ""
    )
    setEditingTourDriverId(
      selected.fahrer_id || ""
    )
    setEditingTourVehicleId(
      selected.fahrzeug_id != null
        ? String(
            selected.fahrzeug_id
          )
        : ""
    )
    setEditingTourStatus(
      selected.status
    )
    setTourKmStart(
      selected.km_start != null
        ? String(selected.km_start)
        : ""
    )
    setTourKmEnd(
      selected.km_ende != null
        ? String(selected.km_ende)
        : ""
    )
  }

  useEffect(() => {
    if (tour) {
      loadTourIntoManagement(tour)
    }
  }, [tour])

  async function saveTourChanges() {
    if (!tour) {
      return
    }

    if (!editingTourNumber.trim()) {
      alert(
        "Bitte eine Tournummer eingeben."
      )
      return
    }

    const kmStart = tourKmStart.trim() === ""
      ? null
      : Number(tourKmStart.replace(/\./g, "").replace(/,/g, "."))
    const kmEnd = tourKmEnd.trim() === ""
      ? null
      : Number(tourKmEnd.replace(/\./g, "").replace(/,/g, "."))

    if (kmStart != null && (!Number.isFinite(kmStart) || kmStart < 0)) {
      alert("Bitte einen gültigen Startkilometerstand eingeben.")
      return
    }
    if (kmEnd != null && (!Number.isFinite(kmEnd) || kmEnd < 0)) {
      alert("Bitte einen gültigen Endkilometerstand eingeben.")
      return
    }
    if (kmStart != null && kmEnd != null && kmEnd < kmStart) {
      alert("Der Endkilometerstand darf nicht kleiner als der Startkilometerstand sein.")
      return
    }

    const selectedVehicle = editingTourVehicleId
      ? vehicles.find((item) => item.id === Number(editingTourVehicleId))
      : null

    if (selectedVehicle && !isVehicleAvailableForTour(selectedVehicle)) {
      alert(`Das ausgewählte Fahrzeug ${selectedVehicle.kennzeichen} ist aktuell nicht verfügbar.`)
      return
    }

    const duplicateTour = tours.find(
      (item) =>
        item.id !== tour.id &&
        item.datum === editingTourDate &&
        Boolean(editingTourDriverId) &&
        item.fahrer_id === editingTourDriverId
    )

    if (duplicateTour) {
      const continueDespiteConflict = window.confirm(
        `Hinweis: Der Fahrer ist am ${formatTourDate(editingTourDate)} bereits der Tour ${duplicateTour.tournummer} zugeordnet.\n\nTrotzdem speichern?`
      )
      if (!continueDespiteConflict) return
    }

    setManagementSaving(true)

    const { error } = await supabase
      .from("touren")
      .update({
        tournummer:
          editingTourNumber.trim(),
        datum: editingTourDate,
        fahrer_id:
          editingTourDriverId || null,
        fahrer:
          editingTourDriver.trim() ||
          null,
        fahrzeug_id:
          editingTourVehicleId
            ? Number(
                editingTourVehicleId
              )
            : null,
        status:
          editingTourStatus,
        km_start: kmStart,
        km_ende: kmEnd,
      })
      .eq("id", tour.id)

    setManagementSaving(false)

    if (error) {
      alert(
        "Die Tour konnte nicht gespeichert werden:\n\n" +
          error.message
      )
      return
    }

    setTour((old) =>
      old
        ? { ...old, km_start: kmStart, km_ende: kmEnd }
        : old
    )
    setTours((old) =>
      old.map((item) =>
        item.id === tour.id
          ? { ...item, km_start: kmStart, km_ende: kmEnd }
          : item
      )
    )

    alert(
      "✓ Tour wurde gespeichert."
    )

    await loadTours(tour.id)
  }

  async function deleteTour() {
    if (!tour) {
      return
    }

    const confirmed =
      window.confirm(
        `Möchtest du die Tour "${tour.tournummer}" wirklich löschen?\n\nAlle Lieferungen dieser Tour werden ebenfalls gelöscht.`
      )

    if (!confirmed) {
      return
    }

    setManagementSaving(true)

    const {
      error: deliveriesDeleteError,
    } = await supabase
      .from("lieferungen")
      .delete()
      .eq("tour_id", tour.id)

    if (deliveriesDeleteError) {
      setManagementSaving(false)

      alert(
        "Die Lieferungen konnten nicht gelöscht werden:\n\n" +
          deliveriesDeleteError.message
      )

      return
    }

    const { error } =
      await supabase
        .from("touren")
        .delete()
        .eq("id", tour.id)

    setManagementSaving(false)

    if (error) {
      alert(
        "Die Tour konnte nicht gelöscht werden:\n\n" +
          error.message
      )
      return
    }

    alert(
      "✓ Tour wurde gelöscht."
    )

    setTour(null)
    setDeliveries([])
    setSelectedTourId(null)

    await loadTours()

    if (page === "tour-management") {
      setPage("tour-management")
    }
  }

  function startEditingDelivery(
    delivery: Delivery
  ) {
    setEditingDeliveryId(
      delivery.id
    )

    setEditingDeliveryCustomer(
      delivery.customer
    )

    setEditingDeliveryAddress(
      delivery.address
    )

    setEditingDeliveryTime(
      delivery.plannedTime
    )
  }

  function cancelEditingDelivery() {
    setEditingDeliveryId(null)
    setEditingDeliveryCustomer("")
    setEditingDeliveryAddress("")
    setEditingDeliveryTime("")
  }

  async function saveEditedDelivery() {
    if (!editingDeliveryId) {
      return
    }

    if (
      !editingDeliveryCustomer.trim() ||
      !editingDeliveryAddress.trim() ||
      !editingDeliveryTime
    ) {
      alert(
        "Bitte Kunde, Adresse und Uhrzeit ausfüllen."
      )
      return
    }

    setManagementSaving(true)

    const { error } = await supabase
      .from("lieferungen")
      .update({
        kundename:
          editingDeliveryCustomer.trim(),
        adresse:
          editingDeliveryAddress.trim(),
        geplante_zeit:
          editingDeliveryTime,
      })
      .eq(
        "id",
        editingDeliveryId
      )

    setManagementSaving(false)

    if (error) {
      alert(
        "Die Lieferung konnte nicht gespeichert werden:\n\n" +
          error.message
      )
      return
    }

    cancelEditingDelivery()

    if (tour) {
      await loadDeliveries(
        tour.id
      )
    }
  }

  async function moveDelivery(deliveryId: number, direction: -1 | 1) {
    if (!tour || deliveries.length < 2) return

    const currentIndex = deliveries.findIndex((item) => item.id === deliveryId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= deliveries.length) return

    const reordered = [...deliveries]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    setDeliveries(reordered.map((item, index) => ({ ...item, sortOrder: index + 1 })))

    const updates = reordered.map((item, index) =>
      supabase
        .from("lieferungen")
        .update({ sortierung: index + 1 })
        .eq("id", item.id)
    )

    const results = await Promise.all(updates)
    const failed = results.find((result) => result.error)

    if (failed?.error) {
      alert("Die Reihenfolge konnte nicht gespeichert werden:\n\n" + failed.error.message)
      if (tour) await loadDeliveries(tour.id)
    }
  }

  async function deleteDelivery(
    deliveryId: number
  ) {
    const confirmed =
      window.confirm(
        "Möchtest du diese Lieferung wirklich löschen?"
      )

    if (!confirmed) {
      return
    }

    const { error } =
      await supabase
        .from("lieferungen")
        .delete()
        .eq("id", deliveryId)

    if (error) {
      alert(
        "Die Lieferung konnte nicht gelöscht werden:\n\n" +
          error.message
      )
      return
    }

    if (tour) {
      await loadDeliveries(
        tour.id
      )
    }
  }

  async function addManagementDeliveryItem() {
    if (!tour) {
      return
    }

    if (
      !managementDeliveryCustomer.trim() ||
      !managementDeliveryAddress.trim() ||
      !managementDeliveryTime
    ) {
      alert(
        "Bitte Kunde, Adresse und Uhrzeit ausfüllen."
      )
      return
    }

    setManagementSaving(true)

    const { error } = await supabase
      .from("lieferungen")
      .insert({
        tour_id: tour.id,
        sortierung: deliveries.length + 1,
        kundename:
          managementDeliveryCustomer.trim(),
        adresse:
          managementDeliveryAddress.trim(),
        geplante_zeit:
          managementDeliveryTime,
        status: "Offen",
      })

    setManagementSaving(false)

    if (error) {
      alert(
        "Die Lieferung konnte nicht hinzugefügt werden:\n\n" +
          error.message
      )
      return
    }

    setManagementDeliveryCustomer("")
    setManagementDeliveryAddress("")
    setManagementDeliveryTime("")
    setAddingManagementDelivery(false)

    await loadDeliveries(
      tour.id
    )
  }

  // =====================================================
  // MANGEL
  // =====================================================

  const [defect, setDefect] =
    useState<Defect>({
      category: "",
      description: "",
      priority: "Normal",
    })

  const [defectSubmitted, setDefectSubmitted] =
    useState(false)

  const [defectSaving, setDefectSaving] =
    useState(false)

  // =====================================================
  // MANGEL-ZÄHLER
  // =====================================================

  const [defectCounts, setDefectCounts] =
    useState<DefectCounts>({
      dringend: 0,
      wichtig: 0,
      normal: 0,
      gesamt: 0,
    })

    // =====================================================
  // MANGEL-POPUP
  // =====================================================

  const [defectNotification, setDefectNotification] =
    useState<DefectNotification | null>(null)

  // =====================================================
  // MANGEL-DETAILS
  // =====================================================

  const [defectDetails, setDefectDetails] =
    useState<DefectRecord[]>([])

  const [selectedDefectPriority, setSelectedDefectPriority] =
    useState<string | null>(null)

  const [defectDetailsLoading, setDefectDetailsLoading] =
    useState(false)

  const [defectUpdatingId, setDefectUpdatingId] =
    useState<number | null>(null)

  async function openDefectDetails(priority: string) {
    setSelectedDefectPriority(priority)
    setDefectDetailsLoading(true)

    const { data, error } = await supabase
      .from("maengel")
      .select(
        "id, fahrzeug_id, kennzeichen, fahrer, datum, kategorie, beschreibung, prioritaet, status"
      )
      .eq("status", "Offen")
      .eq("prioritaet", priority)
      .order("datum", {
        ascending: false,
      })

    setDefectDetailsLoading(false)

    if (error) {
      console.error(
        "Fehler beim Laden der Mangel-Details:",
        error
      )

      alert(
        "Die Mangel-Details konnten nicht geladen werden:\n\n" +
          error.message
      )

      setDefectDetails([])
      return
    }

    setDefectDetails(
      (data || []).map((row) => ({
        id: Number(row.id),
        fahrzeug_id:
          row.fahrzeug_id != null
            ? Number(row.fahrzeug_id)
            : null,
        kennzeichen: String(
          row.kennzeichen || "Unbekannt"
        ),
        fahrer: String(
          row.fahrer || "Nicht angegeben"
        ),
        datum: String(row.datum || ""),
        kategorie: String(
          row.kategorie || "Sonstiges"
        ),
        beschreibung: String(
          row.beschreibung || ""
        ),
        prioritaet: String(
          row.prioritaet || "Normal"
        ),
        status: String(
          row.status || "Offen"
        ),
      }))
    )
  }

  function closeDefectDetails() {
    setSelectedDefectPriority(null)
    setDefectDetails([])
  }

  async function markDefectAsDone(id: number) {
    const confirmDone = window.confirm(
      "Soll dieser Mangel wirklich als erledigt markiert werden?"
    )

    if (!confirmDone) {
      return
    }

    setDefectUpdatingId(id)

    const { error } = await supabase
      .from("maengel")
      .update({ status: "Erledigt" })
      .eq("id", id)

    setDefectUpdatingId(null)

    if (error) {
      console.error(
        "Fehler beim Abschließen des Mangels:",
        error
      )

      alert(
        "Der Mangel konnte nicht als erledigt markiert werden:\n\n" +
          error.message
      )
      return
    }

    setDefectDetails((current) =>
      current.filter((item) => item.id !== id)
    )

    await loadDefectCounts()
  }

  async function loadDefectCounts() {

    const { data, error } = await supabase
      .from("maengel")
      .select("prioritaet")
      .eq("status", "Offen")

    if (error) {
      console.error(
        "Fehler beim Laden der Mängel:",
        error
      )

      return
    }

    let dringend = 0
    let wichtig = 0
    let normal = 0

    ;(data || []).forEach((row) => {
      const priority =
        String(
          row.prioritaet || "Normal"
        )

      if (priority === "Dringend") {
        dringend++
      } else if (priority === "Wichtig") {
        wichtig++
      } else {
        normal++
      }
    })

    setDefectCounts({
      dringend,
      wichtig,
      normal,
      gesamt:
        dringend +
        wichtig +
        normal,
    })

  }

  // =====================================================
  // MANGEL-ZÄHLER BEIM START LADEN
  // =====================================================

  useEffect(() => {
    if (!session) return
    loadDefectCounts()
  }, [session])

  // =====================================================
  // SUPABASE REALTIME FÜR NEUE MÄNGEL
  // =====================================================

  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel(
        "maengel-neue-meldungen"
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "maengel",
        },
        (payload) => {
          const newDefect =
            payload.new as Record<
              string,
              unknown
            >

          const notification: DefectNotification = {
            kennzeichen: String(
              newDefect.kennzeichen ||
                ""
            ),
            kategorie: String(
              newDefect.kategorie ||
                "Sonstiges"
            ),
            beschreibung: String(
              newDefect.beschreibung ||
                ""
            ),
            prioritaet: String(
              newDefect.prioritaet ||
                "Normal"
            ),
          }

          setDefectNotification(
            notification
          )

          loadDefectCounts()
        }
      )
      .subscribe((status) => {
        console.log(
          "Mangel-Realtime:",
          status
        )
      })

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [session])

  // =====================================================
  // POPUP AUTOMATISCH AUSBLENDEN
  // =====================================================

  useEffect(() => {
    if (!defectNotification) {
      return
    }

    const timer =
      window.setTimeout(() => {
        setDefectNotification(null)
      }, 8000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [defectNotification])

  async function submitDefect() {
    if (!defect.category) {
      alert(
        "Bitte eine Kategorie auswählen."
      )
      return
    }

    if (!defect.description.trim()) {
      alert(
        "Bitte eine Beschreibung eingeben."
      )
      return
    }

    if (!vehicle) {
      alert(
        "Es wurde kein Fahrzeug geladen. Der Mangel kann nicht gespeichert werden."
      )
      return
    }

    setDefectSaving(true)
    setDefectSubmitted(false)

    const { error } = await supabase
      .from("maengel")
      .insert({
        fahrzeug_id: vehicle.id,
        kennzeichen: vehicle.kennzeichen,
        fahrer: "Max Mustermann",
        kategorie: defect.category,
        beschreibung:
          defect.description.trim(),
        prioritaet: defect.priority,
        foto: null,
        status: "Offen",
      })

    setDefectSaving(false)

    if (error) {
      console.error(
        "Fehler beim Speichern des Mangels:",
        error
      )

      alert(
        "Der Mangel konnte nicht gespeichert werden:\n\n" +
          error.message
      )

      return
    }

    await loadDefectCounts()

    setDefectSubmitted(true)

    setDefect({
      category: "",
      description: "",
      priority: "Normal",
    })

    setTimeout(() => {
      setDefectSubmitted(false)
    }, 3000)
  }

  function handlePhoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const photoUrl =
      URL.createObjectURL(file)

    setDefect((old) => ({
      ...old,
      photo: photoUrl,
    }))
  }

  async function loadDocuments() {
    if (!session?.user?.id) return
    setDocumentLoading(true)
    setDocumentError("")

    let query = supabase
      .from("dokumente")
      .select("id, fahrzeug_id, fahrer_id, dokumenttyp, dateiname, speicherpfad, ablaufdatum, notiz, erstellt_am, erstellt_von")
      .order("erstellt_am", { ascending: false })

    if (currentUser?.rolle === "Fahrer") {
      query = query.eq("fahrer_id", currentUser.id)
    }

    const { data, error } = await query

    if (error) {
      console.error("Fehler beim Laden der Dokumente:", error)
      setDocumentError(error.message)
      setDocumentRows([])
    } else {
      setDocumentRows((data || []) as DocumentRecord[])
    }

    setDocumentLoading(false)
  }

  function getDocumentVehicleLabel(vehicleId: number | null) {
    if (vehicleId == null) return "Kein Fahrzeug"
    const found = vehicles.find((item) => item.id === vehicleId)
    return found ? `${found.kennzeichen} · ${found.fahrzeugtyp || "Fahrzeug"}` : `Fahrzeug #${vehicleId}`
  }

  function getDocumentDriverLabel(driverId: string | null) {
    if (!driverId) return "Kein Fahrer"
    const found = driverProfiles.find((item) => item.id === driverId)
    return found ? (found.name || found.email) : `Fahrer #${driverId}`
  }

  function isDocumentExpiringSoon(date: string | null) {
    if (!date) return false
    const expiry = new Date(`${date}T00:00:00`)
    const today = new Date(`${getToday()}T00:00:00`)
    const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
    return days >= 0 && days <= 30
  }

  function isDocumentExpired(date: string | null) {
    if (!date) return false
    return date < getToday()
  }

  async function uploadDocument() {
    if (!documentFile) {
      alert("Bitte zuerst eine Datei auswählen.")
      return
    }

    if (!currentUser?.id) {
      alert("Kein angemeldeter Benutzer.")
      return
    }

    if (documentFile.size > 15 * 1024 * 1024) {
      alert("Die Datei darf maximal 15 MB groß sein.")
      return
    }

    const isDriver = currentUser.rolle === "Fahrer"
    if (isDriver && !documentDriverId) {
      setDocumentDriverId(currentUser.id)
    }

    if (!isDriver && !documentVehicleId && !documentDriverId) {
      alert("Bitte ein Fahrzeug oder einen Fahrer auswählen.")
      return
    }

    if (isDriver && documentType !== "Führerschein") {
      alert("Als Fahrer können nur eigene Fahrerdokumente hochgeladen werden.")
      return
    }

    setDocumentUploading(true)
    setDocumentError("")
    setDocumentMessage("")

    const safeName = documentFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const ownerPart = documentDriverId || documentVehicleId || currentUser.id
    const path = `${ownerPart}/${crypto.randomUUID()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("dokumente")
      .upload(path, documentFile, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Fehler beim Datei-Upload:", uploadError)
      setDocumentError(uploadError.message)
      setDocumentUploading(false)
      return
    }

    const { error: insertError } = await supabase
      .from("dokumente")
      .insert({
        fahrzeug_id: isDriver ? null : (documentVehicleId ? Number(documentVehicleId) : null),
        fahrer_id: isDriver ? currentUser.id : (documentDriverId || null),
        dokumenttyp: documentType,
        dateiname: documentFile.name,
        speicherpfad: path,
        ablaufdatum: documentExpiry || null,
        notiz: documentNote.trim() || null,
        erstellt_von: currentUser.id,
      })

    if (insertError) {
      await supabase.storage.from("dokumente").remove([path])
      console.error("Fehler beim Speichern des Dokuments:", insertError)
      setDocumentError(insertError.message)
      setDocumentUploading(false)
      return
    }

    setDocumentFile(null)
    setDocumentVehicleId("")
    setDocumentDriverId(isDriver ? currentUser.id : "")
    setDocumentExpiry("")
    setDocumentNote("")
    setDocumentMessage("Dokument erfolgreich hochgeladen.")
    setDocumentUploading(false)
    await loadDocuments()
  }

  async function openDocument(document: DocumentRecord) {
    const { data, error } = await supabase.storage
      .from("dokumente")
      .createSignedUrl(document.speicherpfad, 300)

    if (error || !data?.signedUrl) {
      alert("Das Dokument konnte nicht geöffnet werden.\n\n" + (error?.message || "Unbekannter Fehler"))
      return
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  async function deleteDocument(document: DocumentRecord) {
    if (!window.confirm(`Dokument „${document.dateiname}“ wirklich löschen?`)) return

    const { error: fileError } = await supabase.storage
      .from("dokumente")
      .remove([document.speicherpfad])

    if (fileError) {
      alert("Die Datei konnte nicht gelöscht werden.\n\n" + fileError.message)
      return
    }

    const { error: rowError } = await supabase
      .from("dokumente")
      .delete()
      .eq("id", document.id)

    if (rowError) {
      alert("Der Dokumenteintrag konnte nicht gelöscht werden.\n\n" + rowError.message)
      return
    }

    await loadDocuments()
  }

  // =====================================================
  // SOP / SCHULUNGEN
  // =====================================================

  async function loadSops() {
    if (!currentUser?.id || currentUser.freigabestatus !== "Freigegeben" || !currentUser.aktiv) return

    setSopLoading(true)
    setSopError("")

    const { data, error } = await supabase
      .from("sops")
      .select("id, titel, beschreibung, inhalt, version, aktiv, erstellt_am, geaendert_am, erstellt_von")
      .eq("aktiv", true)
      .order("geaendert_am", { ascending: false })

    if (error) {
      console.error("Fehler beim Laden der SOPs:", error)
      setSopError(error.message)
      setSops([])
      setSopConfirmations([])
      setSopLoading(false)
      return
    }

    const activeSops = (data || []) as SopRecord[]
    setSops(activeSops)

    const { data: confirmations, error: confirmationError } = await supabase
      .from("sop_bestaetigungen")
      .select("id, sop_id, fahrer_id, version, bestaetigt_am, bestaetigungstext")
      .eq("fahrer_id", currentUser.id)

    if (confirmationError) {
      console.error("Fehler beim Laden der SOP-Bestätigungen:", confirmationError)
      setSopError(confirmationError.message)
    } else {
      const loadedConfirmations = (confirmations || []) as SopConfirmation[]
      setSopConfirmations(loadedConfirmations)

      if (currentUser.rolle === "Fahrer") {
        const pending = activeSops.filter(
          (sop) => !loadedConfirmations.some(
            (item) => item.sop_id === sop.id && item.version === sop.version && item.fahrer_id === currentUser.id
          )
        )
        setSopReminderOpen(pending.length > 0)
      }
    }

    setSopLoading(false)
  }

  async function loadAdminSopOverview() {
    if (!isAdmin) return

    setAdminSopLoading(true)
    setAdminSopError("")

    const [{ data: sopRows, error: sopError }, { data: confirmationRows, error: confirmationError }] = await Promise.all([
      supabase
        .from("sops")
        .select("id, titel, beschreibung, inhalt, version, aktiv, erstellt_am, geaendert_am, erstellt_von")
        .order("geaendert_am", { ascending: false }),
      supabase
        .from("sop_bestaetigungen")
        .select("id, sop_id, fahrer_id, version, bestaetigt_am, bestaetigungstext")
        .order("bestaetigt_am", { ascending: false }),
    ])

    if (sopError) {
      setAdminSopError(sopError.message)
      setAdminSopLoading(false)
      return
    }

    if (confirmationError) {
      setAdminSopError(confirmationError.message)
      setAdminSopLoading(false)
      return
    }

    const usersById = new Map<string, AppUser>(appUsers.map((user) => [user.id, user]))
    const confirmations = (confirmationRows || []).map((row) => {
      const user = usersById.get(String(row.fahrer_id))
      return {
        id: Number(row.id),
        sop_id: Number(row.sop_id),
        fahrer_id: String(row.fahrer_id),
        version: String(row.version),
        bestaetigt_am: row.bestaetigt_am ? String(row.bestaetigt_am) : null,
        bestaetigungstext: row.bestaetigungstext ? String(row.bestaetigungstext) : null,
        fahrer_name: user?.name || "Unbekannter Benutzer",
        fahrer_email: user?.email || "",
      } as AdminSopConfirmation
    })

    setSops((sopRows || []) as SopRecord[])
    setAdminSopConfirmations(confirmations)
    setAdminSopLoading(false)
  }

  async function downloadSopConfirmationPdf(user: AppUser) {
    if (!isAdmin) return

    setAdminSopPdfLoadingId(user.id)
    try {
      const [{ data: sopRows, error: sopError }, { data: confirmationRows, error: confirmationError }] = await Promise.all([
        supabase
          .from("sops")
          .select("id, titel, beschreibung, inhalt, version, aktiv, erstellt_am, geaendert_am, erstellt_von")
          .order("titel", { ascending: true }),
        supabase
          .from("sop_bestaetigungen")
          .select("id, sop_id, fahrer_id, version, bestaetigt_am, bestaetigungstext")
          .eq("fahrer_id", user.id)
          .order("bestaetigt_am", { ascending: true }),
      ])

      if (sopError || confirmationError) {
        alert("Die SOP-Bestätigungen konnten nicht geladen werden.\n\n" + (sopError?.message || confirmationError?.message))
        return
      }

      const allSops = (sopRows || []) as SopRecord[]
      const confirmations = (confirmationRows || []) as SopConfirmation[]
      const confirmedKeys = new Set(confirmations.map((item) => `${item.sop_id}|${item.version}`))
      const confirmedSops = confirmations.map((confirmation) => {
        const sop = allSops.find((item) => item.id === confirmation.sop_id && item.version === confirmation.version)
        return { confirmation, sop }
      })

      const doc = new jsPDF()
      const margin = 16
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let y = 18

      const addText = (text: string, x = margin, fontSize = 10, maxWidth = pageWidth - margin * 2) => {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(fontSize)
        const lines = doc.splitTextToSize(text, maxWidth) as string[]
        for (const line of lines) {
          if (y > pageHeight - 18) {
            doc.addPage()
            y = 18
          }
          doc.text(line, x, y)
          y += fontSize * 0.5 + 3
        }
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text("TransportAPP – SOP-Bestätigungen", margin, y)
      y += 10

      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text("Fahrer", margin, y)
      y += 6
      addText(user.name || "Ohne Namen")
      addText(user.email)
      y += 4

      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text("Erstellter Bericht", margin, y)
      y += 6
      addText(new Date().toLocaleString("de-DE"))
      y += 6

      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Bestätigte SOPs", margin, y)
      y += 8

      if (confirmedSops.length === 0) {
        addText("Noch keine SOP bestätigt.")
      } else {
        for (const item of confirmedSops) {
          const sop = item.sop
          doc.setFont("helvetica", "bold")
          doc.setFontSize(10)
          if (y > pageHeight - 30) {
            doc.addPage()
            y = 18
          }
          doc.text(sop?.titel || `SOP #${item.confirmation.sop_id}`, margin, y)
          y += 5
          addText(`Version: ${item.confirmation.version}`)
          addText(`Bestätigt von: ${user.name || "Ohne Namen"}`)
          addText(`E-Mail: ${user.email}`)
          addText(`Bestätigt am: ${item.confirmation.bestaetigt_am ? new Date(item.confirmation.bestaetigt_am).toLocaleString("de-DE") : "—"}`)
          y += 5
        }
      }

      y += 4
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      if (y > pageHeight - 30) {
        doc.addPage()
        y = 18
      }
      doc.text("Noch offene SOPs", margin, y)
      y += 8

      const activeSops = allSops.filter((sop) => sop.aktiv)
      const openSops = activeSops.filter((sop) => !confirmedKeys.has(`${sop.id}|${sop.version}`))

      if (openSops.length === 0) {
        addText("Alle aktuell aktiven SOPs wurden bestätigt.")
      } else {
        for (const sop of openSops) {
          addText(`• ${sop.titel} – Version ${sop.version}`)
        }
      }

      doc.save(`SOP-Bestaetigungen-${(user.name || "Fahrer").replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, "_")}.pdf`)
    } finally {
      setAdminSopPdfLoadingId(null)
    }
  }

  function resetSopForm() {
    setSopFormOpen(false)
    setSopEditingId(null)
    setSopTitle("")
    setSopDescription("")
    setSopContent("")
    setSopVersion("1.0")
  }

  function openSopCreate() {
    setSopEditingId(null)
    setSopTitle("")
    setSopDescription("")
    setSopContent("")
    setSopVersion("1.0")
    setSopFormOpen(true)
  }

  function openSopEdit(sop: SopRecord) {
    setSopEditingId(sop.id)
    setSopTitle(sop.titel)
    setSopDescription(sop.beschreibung || "")
    setSopContent(sop.inhalt)
    setSopVersion(sop.version)
    setSopFormOpen(true)
  }

  async function saveSop() {
    if (!canManageSops) return
    if (!sopTitle.trim() || !sopContent.trim() || !sopVersion.trim()) {
      alert("Bitte Titel, Inhalt und Version ausfüllen.")
      return
    }

    setSopSaving(true)

    const payload = {
      titel: sopTitle.trim(),
      beschreibung: sopDescription.trim() || null,
      inhalt: sopContent.trim(),
      version: sopVersion.trim(),
      aktiv: true,
    }

    const result = sopEditingId
      ? await supabase.from("sops").update(payload).eq("id", sopEditingId)
      : await supabase.from("sops").insert({ ...payload, erstellt_von: currentUser?.id || null })

    if (result.error) {
      alert("SOP konnte nicht gespeichert werden:\n\n" + result.error.message)
      setSopSaving(false)
      return
    }

    resetSopForm()
    await loadSops()
    setSopSaving(false)
  }

  async function deactivateSop(sopId: number) {
    if (!canManageSops) return
    if (!window.confirm("Diese SOP wirklich deaktivieren?")) return

    const { error } = await supabase
      .from("sops")
      .update({ aktiv: false })
      .eq("id", sopId)

    if (error) {
      alert("SOP konnte nicht deaktiviert werden:\n\n" + error.message)
      return
    }

    await loadSops()
  }

  function hasConfirmedSop(sop: SopRecord) {
    return sopConfirmations.some(
      (item) => item.sop_id === sop.id && item.version === sop.version && item.fahrer_id === currentUser?.id
    )
  }

  async function confirmSop(sop: SopRecord) {
    if (!currentUser?.id || currentUser.freigabestatus !== "Freigegeben") return
    if (hasConfirmedSop(sop)) return

    setSopConfirmingId(sop.id)

    const { data, error } = await supabase
      .from("sop_bestaetigungen")
      .insert({
        sop_id: sop.id,
        fahrer_id: currentUser.id,
        version: sop.version,
        bestaetigungstext: `Ich bestätige die SOP „${sop.titel}“ in Version ${sop.version} gelesen und verstanden zu haben.`,
      })
      .select("id, sop_id, fahrer_id, version, bestaetigt_am, bestaetigungstext")
      .maybeSingle()

    if (error) {
      if (error.code === "23505") {
        await loadSops()
      } else {
        alert("SOP konnte nicht bestätigt werden:\n\n" + error.message)
      }
      setSopConfirmingId(null)
      return
    }

    if (data) {
      const nextConfirmation = data as SopConfirmation
      setSopConfirmations((old) => {
        const next = [...old, nextConfirmation]
        const pending = sops.filter(
          (item) => !next.some(
            (confirmation) =>
              confirmation.sop_id === item.id &&
              confirmation.version === item.version &&
              confirmation.fahrer_id === currentUser.id
          )
        )
        if (pending.length === 0) {
          setSopReminderOpen(false)
        }
        return next
      })
    }

    setSopConfirmingId(null)
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  function navigateTo(
    nextPage:
      | "dashboard"
      | "vehicle"
      | "tour"
      | "defect"
      | "tour-create"
      | "tour-management"
      | "customers"
      | "users"
      | "sops"
      | "driver-tours"
      | "dispatcher"
      | "fleet"
      | "driver-management"
      | "work-time"
      | "reports"
      | "documents"
      | "warnings"
  ) {
    setMenuOpen(false)
    const requiredPermission: Partial<Record<typeof nextPage, PermissionKey>> = {
      dashboard: "dashboard",
      vehicle: "fahrzeugcheck",
      tour: "touren",
      "tour-create": "touren_anlegen",
      "tour-management": "touren_verwalten",
      customers: "kunden",
      defect: "maengel",
      dispatcher: "touren_verwalten",
      fleet: "fahrzeuge",
      "driver-management": "fahrer",
      "work-time": "fahrer",
      reports: "auswertungen",
      documents: "dokumente",
      warnings: "warnungen",
    }

    if (nextPage === "users" && !isAdmin) return
    if (nextPage === "sops" && !currentUser) return
    if (nextPage === "customers" && !(isAdmin || currentUser?.rolle === "Disponent" || hasPermission("kunden") || hasPermission("touren_verwalten") || hasPermission("touren_anlegen"))) return
    if (nextPage !== "users" && nextPage !== "customers" && nextPage !== "sops" && requiredPermission[nextPage] && !hasPermission(requiredPermission[nextPage]!)) return

    setPage(nextPage)

    if (
      nextPage === "tour" ||
      nextPage === "tour-management"
    ) {
      loadTours()
    }

    if (nextPage === "customers" || nextPage === "tour-create") {
      loadCustomers()
    }

    if (nextPage === "dashboard") {
      loadDashboardStats()
      loadDefectCounts()
    }

    if (nextPage === "sops") {
      loadSops()
    }

    if (nextPage === "defect") {
      loadDefectCounts()
    }

    if (nextPage === "reports") {
      if (canManageTours) {
        loadDriverProfiles()
      }
      loadReportData()
    }

    if (nextPage === "documents") {
      loadDocuments()
      if (canManageTours) {
        loadDriverProfiles()
      }
      if (vehicles.length === 0) {
        loadVehicles()
      }
    }
  }

  // =====================================================
  // POPUP-KLASSE
  // =====================================================

  function getDefectNotificationClass() {
    if (
      defectNotification?.prioritaet ===
      "Dringend"
    ) {
      return "defect-notification urgent"
    }

    if (
      defectNotification?.prioritaet ===
      "Wichtig"
    ) {
      return "defect-notification important"
    }

    return "defect-notification normal"
  }

  function getDefectPriorityNumber() {
    if (
      defectNotification?.prioritaet ===
      "Dringend"
    ) {
      return "3"
    }

    if (
      defectNotification?.prioritaet ===
      "Wichtig"
    ) {
      return "2"
    }

    return "1"
  }

  // =====================================================
  // ANMELDUNG / PASSWORT-RESET
  // =====================================================

  if (authLoading) {
    return (
      <div className="app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="card" style={{ width: "100%", maxWidth: "460px", textAlign: "center" }}>
          <h1>TransportApp</h1>
          <p>Anmeldung wird geprüft...</p>
        </div>
      </div>
    )
  }

  if (authMode === "reset") {
    return (
      <div className="app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="card" style={{ width: "100%", maxWidth: "460px" }}>
          <h1>TransportApp</h1>
          <p>Neues Passwort festlegen</p>

          <div className="form-group">
            <label>Neues Passwort</label>
            <input
              type="password"
              value={authNewPassword}
              onChange={(event) => setAuthNewPassword(event.target.value)}
              placeholder="Mindestens 6 Zeichen"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label>Neues Passwort wiederholen</label>
            <input
              type="password"
              value={authNewPassword2}
              onChange={(event) => setAuthNewPassword2(event.target.value)}
              placeholder="Passwort wiederholen"
              autoComplete="new-password"
            />
          </div>

          <button className="primary-button" onClick={updatePassword} disabled={authSaving}>
            {authSaving ? "Bitte warten..." : "Passwort speichern"}
          </button>

          {authMessage && (
            <p className="warning" style={{ marginTop: "14px" }}>
              {authMessage}
            </p>
          )}

          <button
            type="button"
            className="secondary-button"
            style={{ marginTop: "12px" }}
            onClick={() => {
              setAuthMode("login")
              setAuthMessage("")
              setAuthNewPassword("")
              setAuthNewPassword2("")
            }}
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="card" style={{ width: "100%", maxWidth: "460px" }}>
          <h1>TransportApp</h1>
          <p>
            {authMode === "login"
              ? "Bitte anmelden."
              : authMode === "signup"
              ? "Neues Benutzerkonto anlegen."
              : "Passwort zurücksetzen."}
          </p>

          {authMode === "signup" && (
            <div className="form-group">
              <label>Name</label>
              <input
                value={authName}
                onChange={(event) => setAuthName(event.target.value)}
                placeholder="z.B. Max Mustermann"
              />
            </div>
          )}

          <div className="form-group">
            <label>E-Mail</label>
            <input
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="name@firma.de"
              autoComplete="email"
            />
          </div>

          {(authMode === "login" || authMode === "signup") && (
            <div className="form-group">
              <label>Passwort</label>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Mindestens 6 Zeichen"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
              />
            </div>
          )}

          <button
            className="primary-button"
            onClick={
              authMode === "login"
                ? loginUser
                : authMode === "signup"
                ? signupUser
                : requestPasswordReset
            }
            disabled={authSaving}
          >
            {authSaving
              ? "Bitte warten..."
              : authMode === "login"
              ? "Anmelden"
              : authMode === "signup"
              ? "Konto anlegen"
              : "Reset-E-Mail senden"}
          </button>

          {authMessage && (
            <p className="warning" style={{ marginTop: "14px" }}>
              {authMessage}
            </p>
          )}

          {authMode === "login" && (
            <button
              type="button"
              className="secondary-button"
              style={{ marginTop: "12px" }}
              onClick={() => {
                setAuthMode("forgot")
                setAuthMessage("")
              }}
            >
              Passwort vergessen?
            </button>
          )}

          {authMode === "forgot" && (
            <button
              type="button"
              className="secondary-button"
              style={{ marginTop: "12px" }}
              onClick={() => {
                setAuthMode("login")
                setAuthMessage("")
              }}
            >
              Zur Anmeldung
            </button>
          )}

          {(authMode === "login" || authMode === "signup") && (
            <button
              type="button"
              className="secondary-button"
              style={{ marginTop: "12px" }}
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login")
                setAuthMessage("")
              }}
            >
              {authMode === "login"
                ? "Neues Konto registrieren"
                : "Zur Anmeldung wechseln"}
            </button>
          )}

          {authMode === "signup" && (
            <p style={{ marginTop: "12px", fontSize: "14px" }}>
              Das erste registrierte Konto wird automatisch als <strong>Admin</strong> angelegt. Weitere neue Konten werden zunächst als <strong>Fahrer</strong> angelegt und müssen vom Administrator freigegeben werden.
            </p>
          )}

          {authMode === "forgot" && (
            <p style={{ marginTop: "12px", fontSize: "14px" }}>
              Wir senden einen sicheren Link an deine E-Mail-Adresse. Das Passwort selbst ist für Admins nicht sichtbar.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="card" style={{ width: "100%", maxWidth: "520px" }}>
          <h2>Benutzerprofil wird geladen</h2>
          <p>Für dieses Konto wurde noch kein TransportApp-Profil gefunden.</p>
          <p>Falls du dich gerade registriert hast, prüfe bitte deine E-Mail-Bestätigung.</p>
          <button className="secondary-button" onClick={logoutUser}>Abmelden</button>
        </div>
      </div>
    )
  }

  if (currentUser.freigabestatus === "Ausstehend") {
    return (
      <div className="app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="card" style={{ width: "100%", maxWidth: "560px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⏳</div>
          <h2>Freigabe ausstehend</h2>
          <p>Dein Konto wartet noch auf die Freigabe durch den Administrator.</p>
          <button className="secondary-button" onClick={logoutUser}>Abmelden</button>
        </div>
      </div>
    )
  }

  if (currentUser.freigabestatus === "Gesperrt") {
    return (
      <div className="app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="card" style={{ width: "100%", maxWidth: "560px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚫</div>
          <h2>Konto gesperrt</h2>
          <p>Dein TransportApp-Konto wurde durch einen Administrator gesperrt.</p>
          <button className="secondary-button" onClick={logoutUser}>Abmelden</button>
        </div>
      </div>
    )
  }

  if (!currentUser.aktiv) {
    return (
      <div className="app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="card" style={{ width: "100%", maxWidth: "520px" }}>
          <h2>Konto deaktiviert</h2>
          <p>Dieses Benutzerkonto ist momentan deaktiviert.</p>
          <button className="secondary-button" onClick={logoutUser}>Abmelden</button>
        </div>
      </div>
    )
  }

  {currentUser.rolle === "Fahrer" && sopReminderOpen && (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.58)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 5000,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ fontSize: "46px", textAlign: "center" }}>📚</div>
        <h2 style={{ textAlign: "center" }}>SOPs müssen noch bestätigt werden</h2>
        <p style={{ textAlign: "center" }}>
          Bitte lies die folgenden Arbeitsanweisungen und bestätige sie, bevor du sie als erledigt markieren kannst.
        </p>

        <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
          {sops
            .filter((sop) => !hasConfirmedSop(sop))
            .map((sop) => (
              <div
                key={sop.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "12px",
                  background: "rgba(245, 158, 11, 0.08)",
                }}
              >
                <strong>{sop.titel}</strong>
                <div style={{ fontSize: "14px", opacity: 0.75 }}>Version {sop.version}</div>
                {sop.beschreibung && <p style={{ marginBottom: "8px" }}>{sop.beschreibung}</p>}
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setSopReminderOpen(false)
                    navigateTo("sops")
                  }}
                >
                  SOP öffnen und lesen
                </button>
              </div>
            ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
          <button type="button" className="secondary-button" onClick={() => setSopReminderOpen(false)}>
            Später öffnen
          </button>
        </div>
      </div>
    </div>
  )}

  // =====================================================
  // FAHRER-TAGESÜBERSICHT
  // =====================================================

  const today = getToday()
  const driverTodayTours =
    currentUser.rolle === "Fahrer"
      ? tours.filter((item) => item.datum === today)
      : []

  const driverTodayTourIds = new Set(
    driverTodayTours.map((item) => item.id)
  )

  const driverTodayDeliveries =
    currentUser.rolle === "Fahrer"
      ? deliveries.filter(() =>
          tour?.id != null && driverTodayTourIds.has(tour.id)
        )
      : []

  const driverCompletedToday =
    driverTodayDeliveries.filter(
      (delivery) => delivery.status === "Erledigt"
    ).length

  const driverTotalToday = driverTodayDeliveries.length

  const driverProgressToday =
    driverTotalToday > 0
      ? Math.round(
          (driverCompletedToday / driverTotalToday) * 100
        )
      : 0

  // =====================================================
  // APP
  // =====================================================

  return (
    <div className="app">

      {/* =================================================
          MANGEL-POPUP
      ================================================= */}

      {defectNotification && (
        <div
          className={
            getDefectNotificationClass()
          }
        >

          <div className="defect-notification-number">
            {getDefectPriorityNumber()}
          </div>

          <div className="defect-notification-content">

            <div className="defect-notification-title">
              ⚠️ Neuer Fahrzeugmangel
            </div>

            <div className="defect-notification-priority">
              Priorität:{" "}
              <strong>
                {
                  defectNotification.prioritaet
                }
              </strong>
            </div>

            <div>
              <strong>
                Fahrzeug:
              </strong>{" "}
              {defectNotification.kennzeichen ||
                "Unbekannt"}
            </div>

            <div>
              <strong>
                Kategorie:
              </strong>{" "}
              {defectNotification.kategorie}
            </div>

            <div className="defect-notification-description">
              {defectNotification.beschreibung}
            </div>

          </div>

          <button
            className="defect-notification-close"
            onClick={() =>
              setDefectNotification(null)
            }
            aria-label="Meldung schließen"
          >
            ×
          </button>

        </div>
      )}

      {/* =================================================
          MANGEL-DETAILS
      ================================================= */}

      {selectedDefectPriority && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDefectDetails()
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "700px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Offene Mängel – {selectedDefectPriority}
                </h2>
                <p style={{ margin: "6px 0 0" }}>
                  Hier siehst du Fahrzeug und Details zum Mangel.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDefectDetails}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "28px",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="Mangel-Details schließen"
              >
                ×
              </button>
            </div>

            {defectDetailsLoading && (
              <p>Mängel werden geladen...</p>
            )}

            {!defectDetailsLoading &&
              defectDetails.length === 0 && (
                <p>
                  Es wurden keine offenen Mängel mit dieser
                  Priorität gefunden.
                </p>
              )}

            {!defectDetailsLoading &&
              defectDetails.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "12px",
                    background: "#f9fafb",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "10px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <strong>🚗 Fahrzeug:</strong>{" "}
                      {item.kennzeichen || "Unbekannt"}
                    </div>

                    <div>
                      <strong>🆔 Fahrzeug-ID:</strong>{" "}
                      {item.fahrzeug_id ?? "Nicht angegeben"}
                    </div>

                    <div>
                      <strong>👤 Fahrer:</strong>{" "}
                      {item.fahrer}
                    </div>

                    <div>
                      <strong>🔧 Kategorie:</strong>{" "}
                      {item.kategorie}
                    </div>

                    <div>
                      <strong>⚠️ Priorität:</strong>{" "}
                      {item.prioritaet}
                    </div>

                    <div>
                      <strong>📌 Status:</strong>{" "}
                      {item.status}
                    </div>

                    <div>
                      <strong>📅 Datum:</strong>{" "}
                      {item.datum
                        ? formatCheckDate(item.datum)
                        : "Nicht angegeben"}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: "12px",
                    }}
                  >
                    <strong>📝 Beschreibung:</strong>
                    <p
                      style={{
                        margin: "6px 0 0",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.beschreibung}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "16px",
                    }}
                  >
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        markDefectAsDone(item.id)
                      }
                      disabled={defectUpdatingId === item.id}
                      style={{
                        cursor:
                          defectUpdatingId === item.id
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          defectUpdatingId === item.id
                            ? 0.7
                            : 1,
                      }}
                    >
                      {defectUpdatingId === item.id
                        ? "Wird erledigt..."
                        : "✓ Als erledigt markieren"}
                    </button>
                  </div>
                </div>
              ))}

            <button
              type="button"
              className="secondary-button"
              onClick={closeDefectDetails}
              style={{ marginTop: "8px" }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}

      <header className="header">
        <div>
          <h1>TransportApp</h1>
          <p>{currentUser.name || currentUser.email}</p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={logoutUser}
        >
          Abmelden
        </button>
      </header>

      {/* NAVIGATION */}

      <button
        type="button"
        className="menu-toggle"
        aria-label="Menü öffnen"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      >
        <span className="menu-toggle-icon">☰</span>
        <span>Menü</span>
      </button>

      {menuOpen && (
        <div
          className="menu-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav className={menuOpen ? "navigation navigation-open" : "navigation"}>
        <div className="navigation-title">
          <span>TransportApp</span>
          <button
            type="button"
            className="navigation-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Menü schließen"
          >
            ×
          </button>
        </div>

        <button
          className={
            page === "dashboard"
              ? "nav active"
              : "nav"
          }
          onClick={() =>
            navigateTo("dashboard")
          }
        >
          <span style={{ marginRight: "8px" }}>🏠</span>Dashboard
        </button>

        <button
          className={
            page === "vehicle"
              ? "nav active"
              : "nav"
          }
          onClick={() =>
            navigateTo("vehicle")
          }
        >
          <span style={{ marginRight: "8px" }}>✅</span>Fahrzeugcheck
        </button>

        <button
          className={
            page === "tour"
              ? "nav active"
              : "nav"
          }
          onClick={() =>
            navigateTo("tour")
          }
        >
          <span style={{ marginRight: "8px" }}>🗺️</span>Tour
        </button>

        {hasPermission("touren") && currentUser.rolle === "Fahrer" && (
          <button
            className={
              page === "driver-tours"
                ? "nav active"
                : "nav"
            }
            onClick={() => navigateTo("driver-tours")}
          >
            <span style={{ marginRight: "8px" }}>🚚</span>Meine Touren
          </button>
        )}

        {(isAdmin || currentUser?.rolle === "Disponent" || hasPermission("kunden") || hasPermission("touren_verwalten") || hasPermission("touren_anlegen")) && (
          <button
            className={page === "customers" ? "nav active" : "nav"}
            onClick={() => navigateTo("customers")}
          >
            <span style={{ marginRight: "8px" }}>👥</span>Kunden
          </button>
        )}

        {hasPermission("touren_anlegen") && (
          <>
            <button
              className={
                page === "tour-create"
                  ? "nav active"
                  : "nav"
              }
              onClick={() =>
                navigateTo("tour-create")
              }
            >
              <span style={{ marginRight: "8px" }}>➕</span>Tour anlegen
            </button>

            {hasPermission("touren_verwalten") && (
            <button
              className={
                page === "tour-management"
                  ? "nav active"
                  : "nav"
              }
              onClick={() =>
                navigateTo(
                  "tour-management"
                )
              }
            >
              <span style={{ marginRight: "8px" }}>📋</span>Touren verwalten
            </button>
            )}
          </>
        )}

                {hasPermission("touren_verwalten") && (
          <button
            className={page === "dispatcher" ? "nav active" : "nav"}
            onClick={() => navigateTo("dispatcher")}
          >
            <span style={{ marginRight: "8px" }}>🎛️</span>Tagessteuerung
          </button>
        )}

        {hasPermission("fahrzeuge") && (
          <button
            className={page === "fleet" ? "nav active" : "nav"}
            onClick={() => navigateTo("fleet")}
          >
            <span style={{ marginRight: "8px" }}>🚛</span>Fahrzeugverwaltung
          </button>
        )}

        {hasPermission("fahrer") && (
          <>
            <button
              className={page === "driver-management" ? "nav active" : "nav"}
              onClick={() => navigateTo("driver-management")}
            >
              <span style={{ marginRight: "8px" }}>👨‍✈️</span>Fahrer & Personal
            </button>

            <button
              className={page === "work-time" ? "nav active" : "nav"}
              onClick={() => navigateTo("work-time")}
            >
              <span style={{ marginRight: "8px" }}>⏱️</span>Arbeitszeit & Kilometer
            </button>
          </>
        )}

        {hasPermission("dokumente") && <button
          className={page === "documents" ? "nav active" : "nav"}
          onClick={() => navigateTo("documents")}
        >
          <span style={{ marginRight: "8px" }}>📁</span>Dokumente
        </button>}

        {hasPermission("auswertungen") && <button
          className={page === "reports" ? "nav active" : "nav"}
          onClick={() => navigateTo("reports")}
        >
          <span style={{ marginRight: "8px" }}>📊</span>Auswertung
        </button>}

        {hasPermission("warnungen") && (
          <button
            className={page === "warnings" ? "nav active" : "nav"}
            onClick={() => navigateTo("warnings")}
          >
            <span style={{ marginRight: "8px" }}>🔔</span>Warnungen
            {centralWarnings.length > 0 && (
              <span className="defect-badges">
                <span className="defect-badge urgent">{centralWarnings.length}</span>
              </span>
            )}
          </button>
        )}

        <button
          className={page === "sops" ? "nav active" : "nav"}
          onClick={() => navigateTo("sops")}
        >
          <span style={{ marginRight: "8px" }}>📚</span>SOP & Schulungen
        </button>

        {isAdmin && (
          <button
            className={
              page === "users"
                ? "nav active"
                : "nav"
            }
            onClick={() => navigateTo("users")}
          >
            <span style={{ marginRight: "8px" }}>⚙️</span>Benutzer & Berechtigungen
          </button>
        )}



      </nav>

      <main className="content">

        {/* =================================================
            MEINE TOUREN
        ================================================= */}

        {page === "driver-tours" && (
          <section>
            <div className="card">
              <h2>Meine Touren</h2>
              <p>
                Hier siehst du ausschließlich die dir zugewiesenen Touren.
              </p>

              {tourLoading && <p>Touren werden geladen...</p>}

              {!tourLoading && tours.length === 0 && (
                <p>Noch keine Touren zugewiesen.</p>
              )}

              {!tourLoading && tours.length > 0 && (
                <>
                  <h3 style={{ marginTop: "20px" }}>Heutige Touren</h3>

                  {driverTodayTours.length === 0 && (
                    <p>Für heute ist keine Tour zugewiesen.</p>
                  )}

                  {driverTodayTours.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "12px",
                        padding: "16px",
                        marginTop: "12px",
                      }}
                    >
                      <strong>{item.tournummer}</strong>
                      <p style={{ margin: "6px 0" }}>
                        Datum: {formatTourDate(item.datum)}
                      </p>
                      <p style={{ margin: "6px 0" }}>
                        Status: {item.status}
                      </p>
                      <p style={{ margin: "6px 0" }}>
                        Fahrer: {item.fahrer || currentUser.name || currentUser.email}
                      </p>
                      <p style={{ margin: "6px 0", fontWeight: 700 }}>
                        Zustellzeit: {tourNextPlannedTimes[item.id] ? `${tourNextPlannedTimes[item.id]} Uhr` : "Keine offene Zustellung"}
                      </p>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                          setSelectedTourId(item.id)
                          setTour(item)
                          loadDeliveries(item.id)
                          setPage("tour")
                        }}
                      >
                        Heutige Tour öffnen
                      </button>
                    </div>
                  ))}

                  <h3 style={{ marginTop: "28px" }}>Weitere zugewiesene Touren</h3>

                  {tours.filter((item) => item.datum !== today).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "12px",
                        padding: "14px",
                        marginTop: "12px",
                      }}
                    >
                      <strong>{item.tournummer}</strong>
                      <p style={{ margin: "6px 0" }}>
                        Datum: {formatTourDate(item.datum)} · Status: {item.status}
                      </p>
                      <p style={{ margin: "6px 0", fontWeight: 700 }}>
                        Zustellzeit: {tourNextPlannedTimes[item.id] ? `${tourNextPlannedTimes[item.id]} Uhr` : "Keine offene Zustellung"}
                      </p>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setSelectedTourId(item.id)
                          setTour(item)
                          loadDeliveries(item.id)
                          setPage("tour")
                        }}
                      >
                        Tour öffnen
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            DASHBOARD
        ================================================= */}

        {page === "dashboard" && (
          <section>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ marginBottom: "6px" }}>
                    Tagesübersicht
                  </h2>

                  <p style={{ marginBottom: 0 }}>
                    Kennzahlen für heute,{" "}
                    {new Date().toLocaleDateString(
                      "de-DE"
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    loadDashboardStats()
                    loadDefectCounts()
                    loadCentralWarnings()
                  }}
                  disabled={dashboardLoading}
                >
                  {dashboardLoading
                    ? "Aktualisiere..."
                    : "↻ Aktualisieren"}
                </button>
              </div>

              {dashboardError && (
                <p className="warning">
                  Dashboard konnte nicht vollständig
                  geladen werden:{" "}
                  {dashboardError}
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "12px",
                  marginTop: "18px",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ fontSize: "28px" }}>
                    🚚
                  </div>
                  <strong>
                    Touren heute
                  </strong>
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      marginTop: "4px",
                    }}
                  >
                    {dashboardLoading
                      ? "..."
                      : dashboardStats.toursToday}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ fontSize: "28px" }}>
                    📦
                  </div>
                  <strong>
                    Lieferungen heute
                  </strong>
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      marginTop: "4px",
                    }}
                  >
                    {dashboardLoading
                      ? "..."
                      : dashboardStats.deliveriesToday}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ fontSize: "28px" }}>
                    ✅
                  </div>
                  <strong>
                    Erledigt
                  </strong>
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      marginTop: "4px",
                    }}
                  >
                    {dashboardLoading
                      ? "..."
                      : dashboardStats.completedToday}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ fontSize: "28px" }}>
                    ⏳
                  </div>
                  <strong>
                    Offen
                  </strong>
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      marginTop: "4px",
                    }}
                  >
                    {dashboardLoading
                      ? "..."
                      : dashboardStats.openToday}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ fontSize: "28px" }}>
                    ⚠️
                  </div>
                  <strong>
                    Verspätet
                  </strong>
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      marginTop: "4px",
                    }}
                  >
                    {dashboardLoading
                      ? "..."
                      : dashboardStats.delayedToday}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ fontSize: "28px" }}>
                    🔧
                  </div>
                  <strong>
                    Offene Mängel
                  </strong>
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      marginTop: "4px",
                    }}
                  >
                    {defectCounts.gesamt}
                  </div>
                </div>
              </div>
            </div>

            {canManageTours && (
              <div className="card" style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ marginBottom: "4px" }}>🔧 Wartungswarnungen</h2>
                    <p style={{ marginBottom: 0 }}>
                      Fahrzeuge mit fälliger oder bald fälliger Wartung.
                    </p>
                  </div>
                  <button type="button" className="secondary-button" onClick={loadFleetOverview} disabled={fleetLoading}>
                    {fleetLoading ? "Prüfe..." : "↻ Wartungen prüfen"}
                  </button>
                </div>

                {!fleetLoading && fleetVehicles.filter((item) => maintenanceState(item).tone !== "success").length === 0 && (
                  <div style={{ marginTop: "14px", padding: "14px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #86efac", fontWeight: 800 }}>
                    🟢 Keine fälligen Wartungen vorhanden.
                  </div>
                )}

                {!fleetLoading && fleetVehicles.filter((item) => maintenanceState(item).tone !== "success").map((item) => {
                  const state = maintenanceState(item)
                  return (
                    <div
                      key={item.id}
                      style={{
                        marginTop: "12px",
                        padding: "14px",
                        borderRadius: "10px",
                        background: state.tone === "danger" ? "#fef2f2" : "#fffbeb",
                        border: state.tone === "danger" ? "2px solid #ef4444" : "2px solid #f59e0b",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "18px", fontWeight: 900 }}>
                            {item.kennzeichen} · {item.hersteller_modell || item.fahrzeugtyp || "Fahrzeug"}
                          </div>
                          <div style={{ marginTop: "5px", fontWeight: 700 }}>
                            {state.label}
                          </div>
                          <div style={{ marginTop: "4px" }}>
                            {maintenanceWarningDetail(item)}
                          </div>
                        </div>
                        <button type="button" className="secondary-button" onClick={() => navigateTo("fleet")}>
                          Fahrzeug öffnen
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="card">
              <h2>
                Hallo {currentUser.name || currentUser.email} 👋
              </h2>
            </div>

            {currentUser.rolle === "Fahrer" && (
              <div className="card" style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ marginBottom: "4px" }}>⏱️ Schicht & Kilometer</h2>
                    <p style={{ marginBottom: 0 }}>
                      Arbeitszeit und Fahrzeugkilometer werden automatisch erfasst.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={loadDriverShift}
                    disabled={driverShiftLoading || driverShiftSaving}
                  >
                    ↻ Aktualisieren
                  </button>
                </div>

                {driverShiftMessage && (
                  <div className={driverShiftMessage.toLowerCase().includes("beendet") ? "success-message" : "warning"} style={{ marginTop: "12px" }}>
                    {driverShiftMessage}
                  </div>
                )}

                {driverShiftLoading ? (
                  <p style={{ marginTop: "16px" }}>Schicht wird geladen…</p>
                ) : !driverShift ? (
                  <div style={{ marginTop: "16px", padding: "16px", border: "1px solid #ddd", borderRadius: "12px" }}>
                    <h3 style={{ marginTop: 0 }}>Schicht starten</h3>
                    <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                      <label>
                        Fahrzeug
                        <select
                          value={shiftVehicleId}
                          onChange={(e) => {
                            const id = e.target.value
                            setShiftVehicleId(id)
                            const selected = getShiftVehicle(id)
                            if (selected?.kilometerstand != null) {
                              setShiftKm(String(selected.kilometerstand))
                            } else {
                              setShiftKm("")
                            }
                          }}
                          disabled={driverShiftSaving}
                        >
                          <option value="">Fahrzeug auswählen…</option>
                          {vehicles
                            .filter(isVehicleAvailableForTour)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.kennzeichen} · {item.hersteller_modell || item.fahrzeugtyp || "Fahrzeug"}
                                {item.kilometerstand != null ? ` · ${Number(item.kilometerstand).toLocaleString("de-DE")} km` : ""}
                              </option>
                            ))}
                        </select>
                      </label>

                      <label>
                        Start-Kilometer
                        <input
                          type="number"
                          min="0"
                          value={shiftKm}
                          onChange={(e) => setShiftKm(e.target.value)}
                          placeholder="z. B. 82000"
                          disabled={driverShiftSaving}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      style={{ marginTop: "12px" }}
                      onClick={startDriverShift}
                      disabled={driverShiftSaving}
                    >
                      {driverShiftSaving ? "Wird gestartet…" : "🟢 Schicht starten"}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ padding: "16px", border: "2px solid #22c55e", borderRadius: "12px", background: "#f0fdf4" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "18px", fontWeight: 900 }}>🟢 Schicht läuft</div>
                          <div style={{ marginTop: "5px" }}>
                            Beginn: <strong>{formatShiftDateTime(driverShift.startzeit)}</strong>
                          </div>
                          <div style={{ marginTop: "4px" }}>
                            Arbeitszeit: <strong>{formatShiftDuration(driverShift.startzeit)}</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: 900 }}>
                          {Number(driverShift.gesamt_km || 0).toLocaleString("de-DE")} km
                        </div>
                      </div>

                      {driverShiftSegments.map((segment, index) => {
                        const segmentVehicle = getShiftVehicle(segment.fahrzeug_id)
                        return (
                          <div key={segment.id || `${segment.schicht_id}-${index}`} style={{ marginTop: "12px", padding: "12px", border: "1px solid #d1d5db", borderRadius: "10px", background: "#fff" }}>
                            <strong>
                              {segmentVehicle?.kennzeichen || `Fahrzeug ${segment.fahrzeug_id}`}
                              {segmentVehicle?.hersteller_modell ? ` · ${segmentVehicle.hersteller_modell}` : ""}
                            </strong>
                            <div style={{ marginTop: "5px" }}>
                              {formatShiftDateTime(segment.startzeit)} – {segment.endzeit ? formatShiftDateTime(segment.endzeit) : "läuft"}
                            </div>
                            <div style={{ marginTop: "4px" }}>
                              {Number(segment.start_km).toLocaleString("de-DE")} km
                              {" → "}
                              {segment.end_km != null ? `${Number(segment.end_km).toLocaleString("de-DE")} km` : "offen"}
                              {" · "}
                              <strong>{segment.gefahrene_km != null ? `${Number(segment.gefahrene_km).toLocaleString("de-DE")} km` : "läuft"}</strong>
                            </div>
                          </div>
                        )
                      })}

                      {!shiftChangeOpen ? (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ marginTop: "12px" }}
                          onClick={() => {
                            const currentSegment = [...driverShiftSegments].reverse().find((item) => !item.endzeit)
                            setShiftChangeVehicleId("")
                            setShiftChangeEndKm("")
    setShiftChangeStartKm("")
                            if (currentSegment) setShiftVehicleId(String(currentSegment.fahrzeug_id))
                            setShiftChangeOpen(true)
                          }}
                          disabled={driverShiftSaving}
                        >
                          🔄 Fahrzeug wechseln
                        </button>
                      ) : (
                        <div style={{ marginTop: "12px", padding: "14px", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#f8fafc" }}>
                          <h3 style={{ marginTop: 0 }}>Fahrzeug wechseln</h3>
                          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                            <label>
                              End-km aktuelles Fahrzeug
                              <input
                                type="number"
                                min="0"
                                value={shiftChangeEndKm}
                                onChange={(e) => setShiftChangeEndKm(e.target.value)}
                                placeholder="aktueller Kilometerstand"
                                disabled={driverShiftSaving}
                              />
                            </label>
                            <label>
                              Neues Fahrzeug
                              <select
                                value={shiftChangeVehicleId}
                                onChange={(e) => {
                                  const id = e.target.value
                                  setShiftChangeVehicleId(id)
                                  const selected = getShiftVehicle(id)
                                  if (selected?.kilometerstand != null) {
                                    setShiftChangeStartKm(String(selected.kilometerstand))
                                  }
                                }}
                                disabled={driverShiftSaving}
                              >
                                <option value="">Neues Fahrzeug auswählen…</option>
                                {vehicles
                                  .filter(isVehicleAvailableForTour)
                                  .filter((item) => {
                                    const currentSegment = [...driverShiftSegments].reverse().find((segment) => !segment.endzeit)
                                    return !currentSegment || item.id !== currentSegment.fahrzeug_id
                                  })
                                  .map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.kennzeichen} · {item.hersteller_modell || item.fahrzeugtyp || "Fahrzeug"}
                                      {item.kilometerstand != null ? ` · ${Number(item.kilometerstand).toLocaleString("de-DE")} km` : ""}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label>
                              Start-km neues Fahrzeug
                              <input
                                type="number"
                                min="0"
                                value={shiftChangeStartKm}
                                onChange={(e) => setShiftChangeStartKm(e.target.value)}
                                placeholder="Start-km neues Fahrzeug"
                                disabled={driverShiftSaving}
                              />
                            </label>
                          </div>
                          <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button type="button" className="primary-button" onClick={changeDriverShiftVehicle} disabled={driverShiftSaving}>
                              {driverShiftSaving ? "Wird gewechselt…" : "Fahrzeugwechsel speichern"}
                            </button>
                            <button type="button" className="secondary-button" onClick={() => setShiftChangeOpen(false)} disabled={driverShiftSaving}>
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: "14px", padding: "14px", border: "1px solid #ddd", borderRadius: "10px" }}>
                        <h3 style={{ marginTop: 0 }}>Schicht beenden</h3>
                        <label>
                          End-Kilometer aktuelles Fahrzeug
                          <input
                            type="number"
                            min="0"
                            value={shiftEndKm}
                            onChange={(e) => setShiftEndKm(e.target.value)}
                            placeholder="aktueller Kilometerstand"
                            disabled={driverShiftSaving}
                          />
                        </label>
                        <button
                          type="button"
                          className="primary-button"
                          style={{ marginTop: "10px" }}
                          onClick={() => {
                            if (window.confirm("Schicht wirklich beenden?")) {
                              endDriverShift()
                            }
                          }}
                          disabled={driverShiftSaving}
                        >
                          {driverShiftSaving ? "Wird beendet…" : "🔴 Schicht beenden"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="card">

              <h2>
                Letzter Fahrzeugcheck
              </h2>

              {vehicleCheckLoading && (
                <p>
                  Fahrzeugcheck wird geladen...
                </p>
              )}

              {!vehicleCheckLoading &&
                vehicleCheckLoadError && (
                  <p className="warning">
                    Fahrzeugcheck konnte nicht
                    geladen werden.
                  </p>
                )}

              {!vehicleCheckLoading &&
                !vehicleCheckLoadError &&
                !lastVehicleCheck && (
                  <p>
                    Noch kein Fahrzeugcheck
                    gespeichert.
                  </p>
                )}

              {!vehicleCheckLoading &&
                lastVehicleCheck && (
                  <div>

                    <p>
                      <strong>
                        Status:
                      </strong>{" "}
                      {lastVehicleCheck.status ||
                        "Unbekannt"}
                    </p>

                    <p>
                      <strong>
                        Datum:
                      </strong>{" "}
                      {formatCheckDate(
                        lastVehicleCheck.datum
                      )}
                    </p>

                    <p>
                      <strong>
                        Fahrer:
                      </strong>{" "}
                      {lastVehicleCheck.fahrer ||
                        "Nicht angegeben"}
                    </p>

                    {lastVehicleCheck.status ===
                      "Bestanden" && (
                      <p className="success">
                        ✓ Fahrzeugcheck bestanden
                      </p>
                    )}

                  </div>
                )}

            </div>

            <div className="card">

              <h2>
                Aktuelle Tour
              </h2>

              {tourLoading && (
                <p>
                  Tour wird geladen...
                </p>
              )}

              {!tourLoading &&
                tourError && (
                  <p className="warning">
                    Tour konnte nicht geladen
                    werden.
                  </p>
                )}

              {!tourLoading &&
                !tourError &&
                tour && (
                  <>
                    <p>
                      <strong>
                        Tour:
                      </strong>{" "}
                      {tour.tournummer}
                    </p>

                    <p>
                      <strong>
                        Datum:
                      </strong>{" "}
                      {formatTourDate(
                        tour.datum
                      )}
                    </p>

                    <p>
                      <strong>
                        Lieferungen:
                      </strong>{" "}
                      {deliveries.length}
                    </p>

                    <p>
                      <strong>
                        Status:
                      </strong>{" "}
                      {tour.status}
                    </p>

                    <button
                      className="primary-button"
                      onClick={() =>
                        navigateTo("tour")
                      }
                    >
                      Tour öffnen
                    </button>
                  </>
                )}

              {!tourLoading &&
                !tourError &&
                !tour && (
                  <>
                    <p>
                      Noch keine Tour vorhanden.
                    </p>

                    <button
                      className="primary-button"
                      onClick={() =>
                        navigateTo(
                          "tour-create"
                        )
                      }
                    >
                      Erste Tour anlegen
                    </button>
                  </>
                )}

            </div>

            {currentUser.rolle === "Fahrer" && (
              <div className="card" style={{ marginBottom: "18px" }}>
                <h3>Heutige Tour</h3>
                {driverTodayTours.length === 0 ? (
                  <p>Heute ist noch keine Tour zugewiesen.</p>
                ) : (
                  <>
                    <p>
                      {driverTodayTours.length} heutige Tour{driverTodayTours.length === 1 ? "" : "en"} zugewiesen.
                    </p>
                    <p>
                      Aktuelle Tour: {driverCompletedToday} von {driverTotalToday} Lieferungen erledigt · {driverProgressToday}%
                    </p>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => navigateTo("driver-tours")}
                    >
                      Meine Touren öffnen
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="dashboard-grid">

              <div
                className="dashboard-card"
                onClick={() =>
                  navigateTo("vehicle")
                }
              >
                <div className="icon">
                  🚚
                </div>

                <h3>
                  Fahrzeugcheck
                </h3>

                <p>
                  Fahrzeug vor Fahrtbeginn
                  prüfen
                </p>
              </div>

              <div
                className="dashboard-card"
                onClick={() =>
                  navigateTo("tour")
                }
              >
                <div className="icon">
                  📦
                </div>

                <h3>
                  Meine Tour
                </h3>

                <p>
                  Lieferungen und Kunden
                  anzeigen
                </p>
              </div>

              {canManageTours && (
                <div
                  className="dashboard-card"
                  onClick={() =>
                    navigateTo(
                      "tour-management"
                    )
                  }
                >
                  <div className="icon">
                    🗂️
                  </div>

                  <h3>
                    Touren verwalten
                  </h3>

                  <p>
                    Touren erstellen und
                    bearbeiten
                  </p>
                </div>
              )}

              {hasPermission("maengel") && (
              <div
                className="dashboard-card"
                onClick={() =>
                  navigateTo("defect")
                }
              >
                <div className="icon">
                  ⚠️
                </div>

                <h3>
                  Mangel melden
                </h3>

                <p>
                  Offene Fahrzeugmängel
                  anzeigen
                </p>

                {defectCounts.gesamt >
                  0 && (
                  <div className="dashboard-defect-counts">

                    {defectCounts.dringend >
                      0 && (
                      <span className="defect-badge urgent">
                        🔴{" "}
                        {
                          defectCounts.dringend
                        }
                      </span>
                    )}

                    {defectCounts.wichtig >
                      0 && (
                      <span className="defect-badge important">
                        🟠{" "}
                        {
                          defectCounts.wichtig
                        }
                      </span>
                    )}

                    {defectCounts.normal >
                      0 && (
                      <span className="defect-badge normal">
                        🟢{" "}
                        {
                          defectCounts.normal
                        }
                      </span>
                    )}

                  </div>
                )}

              </div>
              )}

            </div>


            {canManageTours && (
              <div className="card" style={{marginTop:"16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                  <div>
                    <h3 style={{marginBottom:"4px"}}>🔔 Zentrale Warnungen</h3>
                    <p style={{marginBottom:0}}>Aktuelle Hinweise aus allen wichtigen Bereichen.</p>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => navigateTo("warnings")}>
                    Alle Warnungen öffnen
                  </button>
                </div>
                {warningsError && <p className="warning" style={{marginTop:"10px"}}>{warningsError}</p>}
                {!warningsLoading && centralWarnings.length === 0 && (
                  <div className="success-message" style={{marginTop:"12px"}}>✓ Keine offenen Warnungen.</div>
                )}
                {!warningsLoading && centralWarnings.length > 0 && (
                  <div style={{display:"grid",gap:"8px",marginTop:"12px"}}>
                    {centralWarnings.slice(0,5).map((warning) => (
                      <button
                        key={warning.id}
                        type="button"
                        onClick={() => navigateTo(warning.page)}
                        style={{
                          textAlign:"left",
                          border:"1px solid #e5e7eb",
                          borderRadius:"10px",
                          padding:"10px 12px",
                          background: warning.priority === "dringend" ? "#fef2f2" : "#fff7ed",
                          cursor:"pointer",
                        }}
                      >
                        <strong>{warning.icon} {warning.title}</strong>
                        <div style={{fontSize:"13px",marginTop:"3px"}}>{warning.detail}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          </section>
        )}

        {/* =================================================
            FAHRZEUGCHECK
        ================================================= */}

        {page === "vehicle" && (
          <section>
            <div className="card">
              <h2>Fahrzeugcheck</h2>

              <div style={{ marginBottom: 18 }}>
                <label htmlFor="vehicle-check-select">Fahrzeug</label>
                <select
                  id="vehicle-check-select"
                  value={vehicleCheckVehicleId ?? ""}
                  onChange={(e) =>
                    resetVehicleCheck(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Fahrzeug auswählen</option>
                  {vehicles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kennzeichen} – {item.hersteller_modell || item.fahrzeugtyp || "Fahrzeug"}
                    </option>
                  ))}
                </select>
              </div>

              <p>
                Jeden Punkt bitte ausdrücklich als <strong>In Ordnung</strong> oder <strong>Nicht in Ordnung</strong> bewerten.
                Nicht bewertete Punkte führen nicht zum Bestehen.
              </p>

              {checklistItems.map((item, index) => {
                const value = checklist[index]
                const defect = checklistDefects[index]

                return (
                  <div
                    key={`${item.label}-${index}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <strong>{item.label}</strong>
                    <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={value === "ok" ? "primary-button" : "secondary-button"}
                        onClick={() => setChecklistStatus(index, "ok")}
                      >
                        ✓ In Ordnung
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setChecklistStatus(index, "bad")}
                      >
                        ✕ Nicht in Ordnung
                      </button>
                    </div>

                    {value === "bad" && (
                      <div style={{ marginTop: 10 }}>
                        <label htmlFor={`check-defect-${index}`}>Mangelbeschreibung</label>
                        <textarea
                          id={`check-defect-${index}`}
                          value={defect?.beschreibung || ""}
                          onChange={(e) => updateChecklistDefect(index, "beschreibung", e.target.value)}
                          placeholder={`Was ist bei ${item.label} nicht in Ordnung?`}
                          rows={2}
                        />
                        <label htmlFor={`check-priority-${index}`}>Priorität</label>
                        <select
                          id={`check-priority-${index}`}
                          value={defect?.prioritaet || "Normal"}
                          onChange={(e) => updateChecklistDefect(index, "prioritaet", e.target.value)}
                        >
                          <option>Normal</option>
                          <option>Wichtig</option>
                          <option>Dringend</option>
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                className="primary-button"
                disabled={
                  !vehicleCheckVehicle ||
                  !allChecksCompleted ||
                  vehicleCheckSaving ||
                  vehicleCheckFinished
                }
                onClick={finishVehicleCheck}
              >
                {vehicleCheckSaving
                  ? "Wird gespeichert..."
                  : vehicleCheckFinished
                  ? "✓ Fahrzeugcheck gespeichert"
                  : vehicleCheckPassed
                  ? "Fahrzeugcheck bestanden speichern"
                  : "Fahrzeugcheck mit Mängeln speichern"}
              </button>

              {!allChecksCompleted && vehicleCheckVehicle && (
                <p className="warning">
                  Bitte jeden Prüfpunk mit „In Ordnung“ oder „Nicht in Ordnung“ bewerten.
                </p>
              )}

              {allChecksCompleted && !vehicleCheckPassed && !vehicleCheckFinished && (
                <p className="warning">
                  ⚠️ Der Fahrzeugcheck wird als <strong>nicht bestanden</strong> gespeichert. Die eingetragenen Mängel werden direkt in die Mängelverwaltung übernommen.
                </p>
              )}

              {vehicleCheckMessage && (
                <p className={vehicleCheckPassed ? "success" : "warning"}>
                  {vehicleCheckMessage}
                </p>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            TOUR FAHRERANSICHT
        ================================================= */}

        {page === "tour" && (
          <section>

            <div className="card">

              <h2>
                Meine Tour
              </h2>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showCompletedTours}
                  onChange={(event) => setShowCompletedTours(event.target.checked)}
                />
                Abgeschlossene Touren anzeigen
              </label>

              {visibleTours.length === 0 && !tourLoading && (
                <p>Keine offenen oder aktiven Touren vorhanden. Aktiviere „Abgeschlossene Touren anzeigen“, um abgeschlossene Touren einzublenden.</p>
              )}

              {visibleTours.length > 1 && (
                <div className="form-group">

                  <label>
                    Tour auswählen
                  </label>

                  <select
                    value={
                      selectedTourId
                        ? String(
                            selectedTourId
                          )
                        : ""
                    }
                    onChange={(
                      event
                    ) =>
                      selectTour(
                        Number(
                          event.target.value
                        )
                      )
                    }
                  >
                    {visibleTours.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.tournummer} –{" "}
                          {formatTourDate(
                            item.datum
                          )}
                        </option>
                      )
                    )}
                  </select>

                </div>
              )}

              {tourLoading && (
                <p>
                  Tour und Lieferungen werden
                  geladen...
                </p>
              )}

              {!tourLoading &&
                tourError && (
                  <p className="warning">
                    {tourError}
                  </p>
                )}

              {!tourLoading &&
                !tourError &&
                tour && (
                  <div className="tour-info">

                    <div>
                      <strong>
                        Tour:
                      </strong>{" "}
                      {tour.tournummer}
                    </div>

                    <div>
                      <strong>
                        Datum:
                      </strong>{" "}
                      {formatTourDate(
                        tour.datum
                      )}
                    </div>

                    <div>
                      <strong>
                        Fahrzeug:
                      </strong>{" "}
                      {vehicle
                        ? vehicle.kennzeichen
                        : "Kein Fahrzeug"}
                    </div>

                    <div>
                      <strong>
                        Fahrer:
                      </strong>{" "}
                      {tour.fahrer ||
                        "Max Mustermann"}
                    </div>

                    <div>
                      <strong>
                        Status:
                      </strong>{" "}
                      {tour.status}
                    </div>

                    {currentUser.rolle === "Fahrer" && (
                      <div style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
                        <strong>Tourfortschritt:</strong>{" "}
                        {deliveries.filter((item) => item.status === "Erledigt").length}
                        {" / "}
                        {deliveries.length} Lieferungen erledigt
                        <div
                          style={{
                            marginTop: "8px",
                            height: "10px",
                            background: "#e5e7eb",
                            borderRadius: "999px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${deliveries.length > 0 ? Math.round((deliveries.filter((item) => item.status === "Erledigt").length / deliveries.length) * 100) : 0}%`,
                              height: "100%",
                              background: "#16a34a",
                            }}
                          />
                        </div>
                      </div>
                    )}

                  </div>
                )}

            </div>

            {deliveryMessage && (
              <div className="success-message">
                {deliveryMessage}
              </div>
            )}

            {!tourLoading &&
              !tourError &&
              tour && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "12px",
                }}
              >
                <button
                  className="secondary-button"
                  onClick={() => selectTour(tour.id)}
                  disabled={tourLoading || deliverySaving}
                >
                  🔄 Tour aktualisieren
                </button>
              </div>
            )}

            {!tourLoading &&
              !tourError &&
              currentUser?.rolle === "Fahrer" &&
              deliveries.length > 0 && (
              <div
                className="card"
                style={{
                  border: "2px solid #2563eb",
                  background: "#eff6ff",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ marginBottom: "6px" }}>Heute unterwegs</h2>
                    <p style={{ margin: 0 }}>
                      {deliveries.filter((item) => item.status === "Erledigt").length} von {deliveries.length} Lieferungen erledigt
                    </p>
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                    }}
                  >
                    {deliveries.length > 0
                      ? Math.round(
                          (deliveries.filter((item) => item.status === "Erledigt").length / deliveries.length) * 100
                        )
                      : 0}%
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    height: "12px",
                    background: "#dbeafe",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${deliveries.length > 0 ? Math.round((deliveries.filter((item) => item.status === "Erledigt").length / deliveries.length) * 100) : 0}%`,
                      height: "100%",
                      background: "#16a34a",
                    }}
                  />
                </div>
              </div>
            )}

            {!tourLoading &&
              !tourError &&
              currentUser?.rolle === "Fahrer" &&
              deliveries.length > 0 &&
              (() => {
                const nextId = getNextDeliveryId(deliveries)
                const nextDelivery = deliveries.find((item) => item.id === nextId)
                if (!nextDelivery) return null
                const delay = getDeliveryDelayMinutes(nextDelivery, tour?.datum)
                return (
                  <div
                    className="card"
                    style={{
                      border: isDeliveryDelayed(nextDelivery, tour?.datum) ? "3px solid #dc2626" : "3px solid #2563eb",
                      background: isDeliveryDelayed(nextDelivery, tour?.datum) ? "#fef2f2" : "#eff6ff",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>⭐ NÄCHSTER SCHRITT</div>
                    <h2 style={{ margin: "6px 0" }}>{nextDelivery.customer}</h2>
                    <p style={{ margin: "4px 0", fontWeight: 700 }}>📍 {nextDelivery.address}</p>
                    <p style={{ margin: "8px 0", fontWeight: 800 }}>🕒 Geplant: {nextDelivery.plannedTime || "keine Zeit"} Uhr</p>
                    <p style={{ margin: "8px 0", fontWeight: 900 }}>➡️ {getDeliveryAction(nextDelivery).replace("Nächster Schritt: ", "")}</p>
                    {delay > 0 && (
                      <div style={{ color: "#991b1b", fontWeight: 900, marginTop: "6px" }}>🔴 Verspätet: {delay} Min.</div>
                    )}
                  </div>
                )
              })()}

            {!tourLoading &&
              !tourError &&
              deliveries.length === 0 && (
                <div className="card">
                  <p>
                    Für diese Tour wurden keine
                    Lieferungen gefunden.
                  </p>
                </div>
              )}

            {[...deliveries]
              .sort((a, b) => {
                const timeDifference =
                  getDeliverySortMinutes(a) - getDeliverySortMinutes(b)
                if (timeDifference !== 0) return timeDifference
                return a.id - b.id
              })
              .map(
              (delivery, deliveryIndex) => (
                <div
                  className="card delivery-card"
                  key={`${delivery.id}-${currentTimeTick}`}
                  style={{
                    border: isDeliveryDelayed(delivery, tour?.datum)
                      ? "2px solid #dc2626"
                      : delivery.status === "Erledigt"
                      ? "2px solid #16a34a"
                      : undefined,
                    background: isDeliveryDelayed(delivery, tour?.datum)
                      ? "#fef2f2"
                      : delivery.status === "Erledigt"
                      ? "#f0fdf4"
                      : undefined,
                  }}
                >

                  {currentUser?.rolle === "Fahrer" &&
                    getNextDeliveryId(deliveries) === delivery.id &&
                    delivery.status !== "Erledigt" && (
                    <div
                      style={{
                        marginBottom: "12px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "#dbeafe",
                        border: "2px solid #2563eb",
                        fontWeight: 900,
                        color: "#1e3a8a",
                      }}
                    >
                      ⭐ NÄCHSTER STOPP – jetzt bearbeiten
                    </div>
                  )}

                  <div className="delivery-header">

                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "4px",
                        }}
                      >
                        Stopp {deliveryIndex + 1} von {deliveries.length}
                      </div>

                      <span className="delivery-number">
                        Lieferung{" "}
                        {delivery.id}
                      </span>

                      <h3>
                        {delivery.customer}
                      </h3>

                      <p
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          lineHeight: 1.5,
                          marginTop: "8px",
                        }}
                      >
                        📍 {delivery.address}
                      </p>

                    </div>

                    <div style={{ minWidth: "180px" }}>

                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 700,
                          marginBottom: "6px",
                        }}
                      >
                        Status ändern
                      </label>

                      <select
                        value={delivery.status}
                        disabled={
                          deliverySaving ||
                          (currentUser?.rolle === "Fahrer" &&
                            delivery.status === "Offen" &&
                            getNextDeliveryId(deliveries) !== delivery.id)
                        }
                        onChange={(event) =>
                          changeDeliveryStatus(
                            delivery.id,
                            event.target.value as Delivery["status"]
                          )
                        }
                        style={{
                          width: "100%",
                          minHeight: "42px",
                          fontWeight: 700,
                        }}
                      >
                        <option value="Offen">Offen</option>
                        <option value="Unterwegs">Unterwegs</option>
                        <option value="Beim Kunden">Beim Kunden</option>
                        <option value="Erledigt">Erledigt</option>
                      </select>

                    </div>

                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginTop: "12px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "6px 10px",
                        borderRadius: "999px",
                        fontWeight: 700,
                        fontSize: "13px",
                        background:
                          delivery.status === "Erledigt"
                            ? "#dcfce7"
                            : delivery.status === "Beim Kunden"
                            ? "#fef3c7"
                            : delivery.status === "Unterwegs"
                            ? "#dbeafe"
                            : "#f3f4f6",
                      }}
                    >
                      {delivery.status}
                    </span>

                    {isDeliveryDelayed(delivery, tour?.datum) && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderRadius: "999px",
                          background: "#dc2626",
                          color: "#ffffff",
                          fontWeight: 900,
                          fontSize: "14px",
                          boxShadow: "0 2px 6px rgba(220,38,38,0.25)",
                        }}
                      >
                        🔴 VERSPÄTET{getDeliveryDelayMinutes(delivery, tour?.datum) > 0 ? ` – ${getDeliveryDelayMinutes(delivery, tour?.datum)} Min.` : ""}
                      </span>
                    )}
                  </div>

                  <div className="delivery-details">

                    <div>
                      <strong>
                        Geplante Ankunft
                      </strong>

                      <span>
                        {delivery.plannedTime} Uhr
                      </span>
                    </div>

                    {isDeliveryDelayed(delivery, tour?.datum) && (
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "2px solid #ef4444",
                          fontWeight: 900,
                        }}
                      >
                        🔴 Diese Lieferung ist verspätet – {getDeliveryDelayMinutes(delivery, tour?.datum)} Minuten nach geplanter Ankunft.
                      </div>
                    )}

                    <div>
                      <strong>
                        Ankunft
                      </strong>

                      <span>
                        {delivery.arrivalTime
                          ? delivery.arrivalTime +
                            " Uhr"
                          : "Noch nicht"}
                      </span>
                    </div>

                    <div>
                      <strong>
                        Angeliefert
                      </strong>

                      <span>
                        {delivery.deliveredTime
                          ? delivery.deliveredTime +
                            " Uhr"
                          : "Noch nicht"}
                      </span>
                    </div>

                    <div>
                      <strong>
                        Abfahrt
                      </strong>

                      <span>
                        {delivery.departureTime
                          ? delivery.departureTime +
                            " Uhr"
                          : "Noch nicht"}
                      </span>
                    </div>

                    <div>
                      <strong>
                        Pünktlichkeit
                      </strong>

                      <span>
                        {delivery.punctuality ||
                          "Noch nicht"}
                      </span>
                    </div>

                  </div>

                  {delivery.id === getNextDeliveryId(deliveries) && delivery.status !== "Erledigt" && (
                    <div
                      style={{
                        marginTop: "14px",
                        marginBottom: "10px",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: isDeliveryDelayed(delivery, tour?.datum) ? "#fee2e2" : "#eff6ff",
                        border: isDeliveryDelayed(delivery, tour?.datum) ? "3px solid #ef4444" : "3px solid #2563eb",
                        boxShadow: "0 3px 10px rgba(37,99,235,0.12)",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        ⭐ NÄCHSTER SCHRITT
                      </div>
                      <div style={{ fontSize: "19px", fontWeight: 900, marginTop: "4px" }}>
                        {getDeliveryAction(delivery).replace("Nächster Schritt: ", "")}
                      </div>
                      {isDeliveryDelayed(delivery, tour?.datum) && (
                        <div style={{ marginTop: "5px", color: "#991b1b", fontWeight: 900 }}>
                          🔴 VERSPÄTET – {getDeliveryDelayMinutes(delivery, tour?.datum)} Min.
                        </div>
                      )}
                    </div>
                  )}

                  {delivery.status ===
                    "Offen" && (
                    currentUser?.rolle !== "Fahrer" ||
                    getNextDeliveryId(deliveries) === delivery.id
                  ) && (
                    <button
                      className="primary-button"
                      disabled={deliverySaving}
                      onClick={() =>
                        startDelivery(
                          delivery.id
                        )
                      }
                    >
                      {deliverySaving
                        ? "Wird gespeichert..."
                        : "▶ Fahrt zur Lieferung starten"}
                    </button>
                  )}

                  {currentUser?.rolle === "Fahrer" &&
                    delivery.status === "Offen" &&
                    getNextDeliveryId(deliveries) !== delivery.id && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "#f3f4f6",
                        color: "#4b5563",
                        fontWeight: 700,
                      }}
                    >
                      ⏳ Dieser Stopp ist noch nicht dran. Bitte zuerst den nächsten Stopp bearbeiten.
                    </div>
                  )}

                  {delivery.status ===
                    "Unterwegs" &&
                    activeDelivery ===
                      delivery.id && (
                      <div className="delivery-actions">

                        <button
                          className="primary-button"
                          disabled={deliverySaving}
                          onClick={() =>
                            arriveAtCustomer(
                              delivery.id
                            )
                          }
                        >
                          📍 Ankunft beim Kunden – jetzt
                        </button>

                        <div className="manual-time-box">

                          <h4>
                            Ankunftszeit
                            manuell eintragen
                          </h4>

                          <input
                            type="time"
                            value={
                              delivery.arrivalTime ||
                              ""
                            }
                            disabled={
                              deliverySaving
                            }
                            onChange={(
                              event
                            ) =>
                              setManualArrivalTime(
                                delivery.id,
                                event.target
                                  .value
                              )
                            }
                          />

                        </div>

                      </div>
                    )}

                  {delivery.status ===
                    "Beim Kunden" &&
                    activeDelivery ===
                      delivery.id && (
                      <div className="completion-area">

                        <h3 style={{ marginBottom: "6px" }}>
                          Lieferung dokumentieren
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                            marginBottom: "16px",
                          }}
                        >
                          {["1 Fahrt", "2 Ankunft", "3 Angeliefert", "4 Abfahrt", "5 Erledigt"].map((label, index) => {
                            const activeStep = getDeliveryStep(delivery)
                            const isDone = activeStep >= index + 1
                            return (
                              <span
                                key={label}
                                style={{
                                  padding: "6px 9px",
                                  borderRadius: "999px",
                                  background: isDone ? "#dcfce7" : "#f3f4f6",
                                  border: isDone ? "1px solid #16a34a" : "1px solid #d1d5db",
                                  fontWeight: 800,
                                  fontSize: "12px",
                                }}
                              >
                                {isDone ? "✓ " : ""}{label}
                              </span>
                            )
                          })}
                        </div>

                        <div
                          style={{
                            marginBottom: "14px",
                            padding: "12px",
                            borderRadius: "10px",
                            background: "#eff6ff",
                            border: "2px solid #2563eb",
                            fontWeight: 900,
                          }}
                        >
                          👉 Nächster Schritt: {delivery.departureTime ? "Lieferung abschließen" : delivery.deliveredTime ? "Abfahrt vom Kunden erfassen" : "Lieferung als angeliefert erfassen"}
                        </div>

                        <div className="time-section">

                          <label>
                            <strong>
                              Ankunft beim
                              Kunden
                            </strong>
                          </label>

                          <div className="time-row">

                            <input
                              type="time"
                              value={
                                delivery.arrivalTime ||
                                ""
                              }
                              disabled={
                                deliverySaving
                              }
                              onChange={(
                                event
                              ) =>
                                setManualArrivalTime(
                                  delivery.id,
                                  event.target
                                    .value
                                )
                              }
                            />

                            <button
                              className="secondary-button"
                              disabled={
                                deliverySaving
                              }
                              onClick={() =>
                                arriveAtCustomer(
                                  delivery.id
                                )
                              }
                            >
                              Jetzt
                            </button>

                          </div>

                        </div>

                        <div className="time-section">

                          <label>
                            <strong>
                              Angeliefert
                            </strong>
                          </label>

                          <div className="time-row">

                            <input
                              type="time"
                              value={
                                delivery.deliveredTime ||
                                ""
                              }
                              disabled={
                                deliverySaving
                              }
                              onChange={(
                                event
                              ) =>
                                setDeliveredTime(
                                  delivery.id,
                                  event.target
                                    .value
                                )
                              }
                            />

                            <button
                              className="secondary-button"
                              disabled={
                                deliverySaving
                              }
                              onClick={() =>
                                setDeliveredTime(
                                  delivery.id,
                                  getCurrentTime()
                                )
                              }
                            >
                              Jetzt
                            </button>

                          </div>

                        </div>

                        <div className="time-section">

                          <label>
                            <strong>
                              Abfahrt vom
                              Kunden
                            </strong>
                          </label>

                          <div className="time-row">

                            <input
                              type="time"
                              value={
                                delivery.departureTime ||
                                ""
                              }
                              disabled={
                                deliverySaving
                              }
                              onChange={(
                                event
                              ) =>
                                setDepartureTime(
                                  delivery.id,
                                  event.target
                                    .value
                                )
                              }
                            />

                            <button
                              className="secondary-button"
                              disabled={
                                deliverySaving
                              }
                              onClick={() =>
                                setDepartureTime(
                                  delivery.id,
                                  getCurrentTime()
                                )
                              }
                            >
                              Jetzt
                            </button>

                          </div>

                        </div>

                        <div className="punctuality-box">

                          <strong>
                            Pünktlichkeit
                          </strong>

                          <span>
                            {delivery.punctuality ||
                              "Wird nach Ankunft berechnet"}
                          </span>

                        </div>

                        <label className="complaint">

                          <input
                            type="checkbox"
                            checked={
                              delivery.complaint ||
                              false
                            }
                            disabled={
                              deliverySaving
                            }
                            onChange={(
                              event
                            ) =>
                              setComplaint(
                                delivery.id,
                                event.target
                                  .checked
                              )
                            }
                          />

                          <span>
                            Kunde hat eine
                            Beschwerde
                          </span>

                        </label>

                        <div className="note-section">

                          <label>
                            Notiz /
                            Bemerkung
                          </label>

                          <textarea
                            value={
                              delivery.note ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              handleNoteChange(
                                delivery.id,
                                event.target
                                  .value
                              )
                            }
                            onBlur={(
                              event
                            ) =>
                              saveNote(
                                delivery.id,
                                event.target
                                  .value
                              )
                            }
                            placeholder="z.B. Kunde war nicht vor Ort, Ware beschädigt..."
                          />

                        </div>

                        <button
                          className="primary-button"
                          disabled={
                            deliverySaving
                          }
                          onClick={() =>
                            completeDelivery(
                              delivery.id
                            )
                          }
                        >
                          {deliverySaving
                            ? "Wird gespeichert..."
                            : "✓ Lieferung abschließen"}
                        </button>

                      </div>
                    )}

                  {delivery.status ===
                    "Erledigt" && (
                    <div className="completed-box">

                      <strong>
                        ✓ Lieferung
                        abgeschlossen
                      </strong>

                      <div className="completed-times">

                        <span>
                          Ankunft:{" "}
                          {delivery.arrivalTime} Uhr
                        </span>

                        <span>
                          Angeliefert:{" "}
                          {delivery.deliveredTime} Uhr
                        </span>

                        <span>
                          Abfahrt:{" "}
                          {delivery.departureTime} Uhr
                        </span>

                      </div>

                      {delivery.complaint && (
                        <div className="warning">
                          ⚠ Beschwerde wurde
                          gemeldet
                        </div>
                      )}

                      {delivery.note && (
                        <p>
                          <strong>
                            Notiz:
                          </strong>{" "}
                          {delivery.note}
                        </p>
                      )}

                    </div>
                  )}

                </div>
              )
            )}

          </section>
        )}

        {/* =================================================
            KUNDENVERWALTUNG
        ================================================= */}

        {page === "customers" && (
          <section>
            <div className="card">
              <div className="delivery-header">
                <div>
                  <h2>Kundenverwaltung</h2>
                  <p>Kunden, Adressen, wichtige Hinweise und Beschwerden zentral verwalten.</p>
                </div>
              </div>

              <div className="form-group">
                <label>Suche</label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="z.B. MLL"
                />
              </div>

              <div className="card" style={{ marginTop: "16px" }}>
                <h3>{customerEditingId ? "Kunde bearbeiten" : "Kunde anlegen"}</h3>
                <div className="form-group">
                  <label>Kundenname</label>
                  <input value={customerFormName} onChange={(event) => setCustomerFormName(event.target.value)} placeholder="z.B. MLL GmbH" />
                </div>
                <div className="form-group">
                  <label>Adresse</label>
                  <input value={customerFormAddress} onChange={(event) => setCustomerFormAddress(event.target.value)} placeholder="Straße, PLZ Ort" />
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button className="primary-button" disabled={customerSaving} onClick={saveCustomer}>
                    {customerSaving ? "Wird gespeichert..." : customerEditingId ? "✓ Änderungen speichern" : "+ Kunde anlegen"}
                  </button>
                  {customerEditingId && <button className="secondary-button" onClick={resetCustomerForm}>Abbrechen</button>}
                </div>
                {customerFormMessage && <p className="success" style={{ marginTop: "10px" }}>{customerFormMessage}</p>}
              </div>
            </div>

            <div className="card">
              <h3>Kundenliste</h3>
              {customersLoading && <p>Kunden werden geladen...</p>}
              {!customersLoading && customers.filter((customer) => {
                const query = customerSearch.trim().toLowerCase()
                return !query || customer.name.toLowerCase().includes(query) || String(customer.adresse || "").toLowerCase().includes(query)
              }).length === 0 && <p>Keine Kunden gefunden.</p>}

              {customers.filter((customer) => {
                const query = customerSearch.trim().toLowerCase()
                return !query || customer.name.toLowerCase().includes(query) || String(customer.adresse || "").toLowerCase().includes(query)
              }).map((customer) => {
                const hints = getHintsForCustomer(customer.id)
                const complaints = customerComplaints.filter((item) => item.kunde_id === customer.id)
                return (
                  <div key={customer.id} className="card" style={{ marginTop: "12px", opacity: customer.aktiv ? 1 : 0.65 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ marginBottom: "4px" }}>{customer.name}</h3>
                        <div>{customer.adresse || "Keine Adresse hinterlegt"}</div>
                        <div style={{ marginTop: "6px" }}>{customer.aktiv ? "🟢 Aktiv" : "⚪ Deaktiviert"}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button className="secondary-button" onClick={() => editCustomer(customer)}>Bearbeiten</button>
                        <button className="secondary-button" onClick={() => toggleCustomerActive(customer)}>
                          {customer.aktiv ? "Deaktivieren" : "Aktivieren"}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <strong>⚠ Wichtige Kundenhinweise</strong>
                      {hints.length === 0 && <p style={{ margin: "6px 0" }}>Keine dauerhaften Hinweise.</p>}
                      {hints.map((hint) => (
                        <div key={hint.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "6px" }}>
                          <span>• {hint.hinweis}</span>
                          <button className="secondary-button" onClick={() => deactivateCustomerHint(hint.id)}>Entfernen</button>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          value={customerHintText}
                          onChange={(event) => setCustomerHintText(event.target.value)}
                          placeholder="Neuen dauerhaften Hinweis eingeben"
                          style={{ flex: 1, minWidth: "240px" }}
                        />
                        <button className="primary-button" disabled={customerHintSavingId === customer.id} onClick={() => addCustomerHint(customer.id)}>
                          {customerHintSavingId === customer.id ? "Speichern..." : "+ Hinweis"}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <strong>📣 Kundenbeschwerden</strong>
                      {complaints.length === 0 && <p style={{ margin: "6px 0" }}>Keine Beschwerden gespeichert.</p>}
                      {complaints.map((complaint) => (
                        <div key={complaint.id} className="warning" style={{ marginTop: "8px" }}>
                          <div><strong>{complaint.status}</strong>{complaint.erstellt_am ? ` · ${formatCheckDate(complaint.erstellt_am)}` : ""}</div>
                          <div style={{ marginTop: "4px" }}>{complaint.beschreibung}</div>
                          {complaint.lieferung_id && <div style={{ marginTop: "4px", fontSize: "0.9em" }}>Lieferung #{complaint.lieferung_id}</div>}
                          <button
                            className="primary-button"
                            style={{ marginTop: "8px" }}
                            onClick={async () => {
                              const { error } = await supabase.from("kunden_hinweise").insert({
                                kunde_id: customer.id,
                                hinweis: complaint.beschreibung,
                                wichtig: true,
                                aktiv: true,
                                erstellt_von: session?.user?.id || null,
                              })
                              if (error) {
                                alert("Kundenhinweis konnte nicht übernommen werden:\n\n" + error.message)
                                return
                              }
                              await loadCustomers()
                            }}
                          >
                            ✓ Als dauerhaften Kundenhinweis übernehmen
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* =================================================
            TOUR ANLEGEN
        ================================================= */}

        {page === "tour-create" && (
          <section>

            <div className="card">

              <h2>
                Neue Tour anlegen
              </h2>

              <p>
                Hier kannst du eine komplette
                Tour mit mehreren Lieferungen
                anlegen. Fahrer und Fahrzeug werden <strong>pro Tour</strong> zugeordnet. Ein Fahrer kann dadurch an verschiedenen Tagen unterschiedliche Fahrzeuge fahren.
              </p>

              <div className="form-group">

                <label>
                  Tournummer
                </label>

                <input
                  type="text"
                  value={newTourNumber}
                  onChange={(event) =>
                    setNewTourNumber(
                      event.target.value
                    )
                  }
                  placeholder="z.B. T-2026-002"
                />

              </div>

              <div className="form-group">

                <label>
                  Datum
                </label>

                <input
                  type="date"
                  value={newTourDate}
                  onChange={(event) =>
                    setNewTourDate(
                      event.target.value
                    )
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Fahrer
                </label>

                <select
                  value={newTourDriverId}
                  onChange={(event) => {
                    const id = event.target.value
                    const user = assignmentUsers.find((item) => item.id === id)
                    setNewTourDriverId(id)
                    setNewTourDriver(user?.name || "")
                  }}
                  disabled={assignmentUsersLoading}
                >
                  <option value="">Fahrer auswählen</option>
                  {assignmentUsers
                    .filter((item) => item.rolle === "Fahrer")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.email}
                      </option>
                    ))}
                </select>

              </div>

              <div className="form-group">

                <label>
                  Fahrzeug
                </label>

                <select
                  value={
                    newTourVehicleId
                  }
                  onChange={(event) =>
                    setNewTourVehicleId(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Fahrzeug auswählen
                  </option>

                  {vehicles.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={!isVehicleAvailableForTour(item)}
                      >
                        {item.kennzeichen}
                        {" – "}
                        {item.hersteller_modell ||
                          item.fahrzeugtyp ||
                          "Fahrzeug"}
                        {" – "}
                        {getVehicleStatusLabel(item.status)}
                        {item.kilometerstand != null
                          ? ` – ${item.kilometerstand.toLocaleString("de-DE")} km`
                          : ""}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="form-group">

                <label>
                  Tourstatus
                </label>

                <select
                  value={newTourStatus}
                  onChange={(event) =>
                    setNewTourStatus(
                      event.target.value
                    )
                  }
                >
                  <option value="Offen">
                    Offen
                  </option>

                  <option value="Unterwegs">
                    Unterwegs
                  </option>

                  <option value="Abgeschlossen">
                    Abgeschlossen
                  </option>
                </select>

              </div>

            </div>

            <div className="card">

              <div className="delivery-header">

                <div>
                  <h2>
                    Lieferungen
                  </h2>

                  <p>
                    Füge alle Kunden dieser
                    Tour hinzu.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={
                    addNewDelivery
                  }
                >
                  + Lieferung hinzufügen
                </button>

              </div>

              {newDeliveries.map(
                (
                  delivery,
                  index
                ) => (
                  <div
                    className="card"
                    key={index}
                  >

                    <h3>
                      Lieferung {index + 1}
                    </h3>

                    <div className="form-group">

                      <label>
                        Kunde
                      </label>

                      <input
                        type="text"
                        list="transportapp-kundenliste"
                        value={delivery.customer}
                        onChange={(event) =>
                          handleNewDeliveryCustomerChange(index, event.target.value)
                        }
                        placeholder="z.B. MLL"
                      />

                      <datalist id="transportapp-kundenliste">
                        {customers.filter((item) => item.aktiv).map((item) => (
                          <option key={item.id} value={item.name} />
                        ))}
                      </datalist>

                      {delivery.kundeId && getHintsForCustomer(delivery.kundeId).length > 0 && (
                        <div className="warning" style={{ marginTop: "8px" }}>
                          <strong>⚠ Wichtige Kundenhinweise</strong>
                          {getHintsForCustomer(delivery.kundeId).map((hint) => (
                            <div key={hint.id} style={{ marginTop: "4px" }}>• {hint.hinweis}</div>
                          ))}
                        </div>
                      )}

                    </div>

                    <div className="form-group">

                      <label>
                        Adresse
                      </label>

                      <input
                        type="text"
                        value={delivery.address}
                        readOnly={Boolean(delivery.kundeId)}
                        onChange={(event) =>
                          updateNewDelivery(index, "address", event.target.value)
                        }
                        placeholder={delivery.kundeId ? "Adresse wird automatisch übernommen" : "Straße, PLZ Ort"}
                        style={delivery.kundeId ? { background: "#f3f4f6" } : undefined}
                      />
                      {delivery.kundeId && (
                        <small style={{ display: "block", marginTop: "4px", color: "#4b5563" }}>
                          ✓ Bekannter Kunde – Adresse automatisch aus Kundenverwaltung übernommen.
                        </small>
                      )}

                    </div>

                    <div className="form-group">

                      <label>
                        Geplante Ankunft
                      </label>

                      <input
                        type="time"
                        value={
                          delivery.plannedTime
                        }
                        onChange={(
                          event
                        ) =>
                          updateNewDelivery(
                            index,
                            "plannedTime",
                            event.target
                              .value
                          )
                        }
                      />

                    </div>

                    {newDeliveries.length >
                      1 && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          removeNewDelivery(
                            index
                          )
                        }
                      >
                        Lieferung entfernen
                      </button>
                    )}

                  </div>
                )
              )}

              <button
                className="primary-button"
                disabled={
                  tourCreateSaving
                }
                onClick={createTour}
              >
                {tourCreateSaving
                  ? "Tour wird gespeichert..."
                  : "✓ Tour speichern"}
              </button>

            </div>

          </section>
        )}

        {/* =================================================
            TOUREN VERWALTEN
        ================================================= */}

        {page === "tour-management" && (
          <section>
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                <div>
                  <h2>Touren verwalten</h2>
                  <p style={{marginBottom:"8px"}}>Tour auswählen und bearbeiten.</p>
                  <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}}>
                    <input
                      type="checkbox"
                      checked={showCompletedTours}
                      onChange={(event) => setShowCompletedTours(event.target.checked)}
                    />
                    Abgeschlossene anzeigen
                  </label>
                </div>
                <button className="primary-button" onClick={() => navigateTo("tour-create")}>+ Neue Tour</button>
              </div>

              <div style={{marginTop:"18px"}}>
                <label style={{fontWeight:600}}>Tour auswählen</label>
                <select
                  value={selectedTourId ? String(selectedTourId) : ""}
                  onChange={(event) => {
                    const id = Number(event.target.value)
                    if (id) selectTour(id)
                  }}
                  style={{width:"100%",marginTop:"6px"}}
                >
                  <option value="">Bitte Tour auswählen</option>
                  {visibleTours.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.tournummer} · {formatTourDate(item.datum)} · {item.fahrer || "Kein Fahrer"} · {item.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {tour && (
              <>
                <div className="card">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",flexWrap:"wrap"}}>
                    <div>
                      <h2>{editingTourNumber || tour.tournummer}</h2>
                      <p style={{margin:0}}>{formatTourDate(editingTourDate || tour.datum)}</p>
                    </div>
                    <div className="delivery-status">{editingTourStatus || tour.status}</div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"12px",marginTop:"18px"}}>
                    <div className="form-group">
                      <label>Tournummer</label>
                      <input value={editingTourNumber} onChange={(e)=>setEditingTourNumber(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Datum</label>
                      <input type="date" value={editingTourDate} onChange={(e)=>setEditingTourDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Fahrer</label>
                      <select
                        value={editingTourDriverId}
                        onChange={(e)=>{
                          const id=e.target.value
                          const user=assignmentUsers.find((item)=>item.id===id)
                          setEditingTourDriverId(id)
                          setEditingTourDriver(user?.name || "")
                        }}
                      >
                        <option value="">Fahrer auswählen</option>
                        {assignmentUsers.filter((item)=>item.rolle==="Fahrer").map((item)=>(
                          <option key={item.id} value={item.id}>{item.name || item.email}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fahrzeug</label>
                      <select value={editingTourVehicleId} onChange={(e)=>setEditingTourVehicleId(e.target.value)}>
                        <option value="">Kein Fahrzeug</option>
                        {vehicles.map((item)=>(
                          <option key={item.id} value={item.id}>{item.kennzeichen} · {item.hersteller_modell || item.fahrzeugtyp || "Fahrzeug"}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px"}}>
                    <div className="form-group">
                      <label>Start-km</label>
                      <input type="number" min="0" value={tourKmStart} onChange={(e)=>setTourKmStart(e.target.value)} placeholder="z. B. 82000" />
                    </div>
                    <div className="form-group">
                      <label>End-km</label>
                      <input type="number" min="0" value={tourKmEnd} onChange={(e)=>setTourKmEnd(e.target.value)} placeholder="z. B. 82125" />
                    </div>
                    <div className="form-group">
                      <label>Gefahrene km</label>
                      <div style={{padding:"10px 12px",background:"#f5f5f5",borderRadius:"8px",minHeight:"42px",boxSizing:"border-box"}}>
                        {tourKmStart!=="" && tourKmEnd!=="" && Number(tourKmEnd)>=Number(tourKmStart) ? `${Number(tourKmEnd)-Number(tourKmStart)} km` : "–"}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={editingTourStatus} onChange={(e)=>setEditingTourStatus(e.target.value)}>
                        <option value="Offen">Offen</option>
                        <option value="Unterwegs">Unterwegs</option>
                        <option value="Abgeschlossen">Abgeschlossen</option>
                      </select>
                    </div>
                  </div>

                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"8px"}}>
                    <button className="primary-button" disabled={managementSaving} onClick={saveTourChanges}>
                      {managementSaving ? "Speichern..." : "✓ Tour speichern"}
                    </button>
                    <button className="secondary-button" disabled={managementSaving} onClick={deleteTour}>🗑 Löschen</button>
                  </div>
                </div>

                <div className="card">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                    <div>
                      <h2>Lieferungen</h2>
                      <p style={{margin:0}}>{deliveries.length} Lieferung{deliveries.length===1?"":"en"}</p>
                    </div>
                    <button className="primary-button" onClick={()=>setAddingManagementDelivery(!addingManagementDelivery)}>
                      {addingManagementDelivery ? "Abbrechen" : "+ Lieferung"}
                    </button>
                  </div>

                  {addingManagementDelivery && (
                    <div style={{marginTop:"16px",padding:"16px",background:"#f8fafc",borderRadius:"10px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px"}}>
                        <div className="form-group"><label>Kunde</label><input value={managementDeliveryCustomer} onChange={(e)=>setManagementDeliveryCustomer(e.target.value)} /></div>
                        <div className="form-group"><label>Adresse</label><input value={managementDeliveryAddress} onChange={(e)=>setManagementDeliveryAddress(e.target.value)} /></div>
                        <div className="form-group"><label>Zustellzeit</label><input type="time" value={managementDeliveryTime} onChange={(e)=>setManagementDeliveryTime(e.target.value)} /></div>
                      </div>
                      <button className="primary-button" disabled={managementSaving} onClick={addManagementDeliveryItem}>Lieferung speichern</button>
                    </div>
                  )}

                  {deliveries.length===0 ? (
                    <p style={{marginTop:"18px"}}>Noch keine Lieferungen. Klicke auf „+ Lieferung“.</p>
                  ) : (
                    <div style={{display:"grid",gap:"10px",marginTop:"16px"}}>
                      {deliveries.map((delivery,index)=>(
                        <div key={delivery.id} style={{padding:"14px",border:"1px solid #e5e7eb",borderRadius:"10px"}}>
                          {editingDeliveryId===delivery.id ? (
                            <>
                              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px"}}>
                                <div className="form-group"><label>Kunde</label><input value={editingDeliveryCustomer} onChange={(e)=>setEditingDeliveryCustomer(e.target.value)} /></div>
                                <div className="form-group"><label>Adresse</label><input value={editingDeliveryAddress} onChange={(e)=>setEditingDeliveryAddress(e.target.value)} /></div>
                                <div className="form-group"><label>Zustellzeit</label><input type="time" value={editingDeliveryTime} onChange={(e)=>setEditingDeliveryTime(e.target.value)} /></div>
                              </div>
                              <div style={{display:"flex",gap:"8px"}}>
                                <button className="primary-button" disabled={managementSaving} onClick={saveEditedDelivery}>Speichern</button>
                                <button className="secondary-button" onClick={cancelEditingDelivery}>Abbrechen</button>
                              </div>
                            </>
                          ) : (
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                              <div style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
                                <strong style={{minWidth:"28px"}}>{index+1}.</strong>
                                <div>
                                  <strong>{delivery.customer || "Kein Kunde"}</strong>
                                  <div style={{fontSize:"14px",marginTop:"3px"}}>📍 {delivery.address || "Keine Adresse"}</div>
                                  <div style={{fontSize:"14px",marginTop:"3px"}}>🕐 {delivery.plannedTime || "Keine Zeit"} · {delivery.status}</div>
                                </div>
                              </div>
                              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                                <button className="secondary-button" disabled={index===0} onClick={()=>moveDelivery(delivery.id,-1)}>↑</button>
                                <button className="secondary-button" disabled={index===deliveries.length-1} onClick={()=>moveDelivery(delivery.id,1)}>↓</button>
                                <button className="secondary-button" onClick={()=>startEditingDelivery(delivery)}>Bearbeiten</button>
                                <button className="secondary-button" onClick={()=>deleteDelivery(delivery.id)}>🗑</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* =================================================
            MANGEL
        ================================================= */}

                {page === "dispatcher" && hasPermission("touren_verwalten") && (
          <section>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <h2>Tagessteuerung</h2>
                  <p>Live-Übersicht über Fahrer, Fahrzeuge, Lieferstatus und den aktuellen Stand jeder Tour.</p>
                </div>
                <button type="button" className="secondary-button" onClick={() => loadTours()} disabled={tourLoading}>
                  {tourLoading ? "Aktualisiere..." : "↻ Aktualisieren"}
                </button>
              </div>

              {(() => {
                const today = getToday()
                const todayTours = tours.filter((item) => item.datum === today)
                const assigned = todayTours.filter((item) => item.fahrer_id || item.fahrer).length
                const unassigned = todayTours.length - assigned
                const completed = todayTours.filter((item) =>
                  ["erledigt", "abgeschlossen"].includes(
                    String(item.status || "").trim().toLowerCase()
                  )
                ).length
                const active = todayTours.filter((item) => {
                  const status = String(item.status || "offen").trim().toLowerCase()
                  return !["erledigt", "abgeschlossen", "offen"].includes(status)
                }).length
                const delayed = todayTours.reduce(
                  (sum, item) => sum + (dispatcherDeliveryStats[item.id]?.delayed || 0),
                  0
                )
                const unterwegs = todayTours.reduce(
                  (sum, item) => sum + (dispatcherDeliveryStats[item.id]?.unterwegs || 0),
                  0
                )
                const beimKunden = todayTours.reduce(
                  (sum, item) => sum + (dispatcherDeliveryStats[item.id]?.beimKunden || 0),
                  0
                )

                return (
                  <>
                    <div className="dashboard-grid" style={{ marginTop: "20px" }}>
                      <div className="dashboard-card"><div className="icon">🗺️</div><h3>{todayTours.length}</h3><p>Touren heute</p></div>
                      <div className="dashboard-card"><div className="icon">👨‍✈️</div><h3>{assigned}</h3><p>Fahrer zugewiesen</p></div>
                      <div className="dashboard-card"><div className="icon">⚠️</div><h3>{unassigned}</h3><p>Noch ohne Fahrer</p></div>
                      <div className="dashboard-card"><div className="icon">🚚</div><h3>{active}</h3><p>Aktive Touren</p></div>
                      <div className="dashboard-card"><div className="icon">🛣️</div><h3>{unterwegs}</h3><p>Lieferungen unterwegs</p></div>
                      <div className="dashboard-card"><div className="icon">📍</div><h3>{beimKunden}</h3><p>Beim Kunden</p></div>
                      <div className="dashboard-card"><div className="icon">✅</div><h3>{completed}</h3><p>Abgeschlossen</p></div>
                      <div className="dashboard-card"><div className="icon">⏰</div><h3>{delayed}</h3><p>Verspätete Lieferungen</p></div>
                    </div>

                    <h3 style={{ marginTop: "28px" }}>Heutige Touren</h3>

                    {todayTours.length === 0 ? (
                      <p>Für heute sind keine Touren vorhanden.</p>
                    ) : (
                      <div style={{ display: "grid", gap: "14px" }}>
                        {todayTours.map((item) => {
                          const stats = dispatcherDeliveryStats[item.id] || {
                            total: 0,
                            completed: 0,
                            open: 0,
                            unterwegs: 0,
                            beimKunden: 0,
                            delayed: 0,
                            nextPlanned: null,
                            nextCustomer: null,
                            nextAddress: null,
                            nextStatus: null,
                            currentCustomer: null,
                            currentStatus: null,
                          }
                          const progress = stats.total > 0
                            ? Math.round((stats.completed / stats.total) * 100)
                            : 0
                          const status = String(item.status || "Offen").trim() || "Offen"
                          const statusLower = status.toLowerCase()
                          const statusLabel = ["abgeschlossen", "erledigt"].includes(statusLower)
                            ? "Abgeschlossen"
                            : status
                          const assignedVehicleForLight = vehicles.find(
                            (vehicleItem) => vehicleItem.id === item.fahrzeug_id
                          )
                          const trafficLight = getTourTrafficLight(
                            item,
                            stats,
                            Boolean(assignedVehicleForLight)
                          )

                          return (
                            <div
                              key={item.id}
                              style={{
                                border: "1px solid #ddd",
                                borderRadius: "14px",
                                padding: "16px",
                                background: "#fff",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                                <div>
                                  <strong style={{ fontSize: "18px" }}>{item.tournummer}</strong>
                                  <p style={{ margin: "6px 0 0" }}>
                                    Fahrer: {item.fahrer || "Noch nicht zugewiesen"}
                                  </p>
                                  {(() => {
                                    const assignedVehicle = vehicles.find(
                                      (vehicleItem) => vehicleItem.id === item.fahrzeug_id
                                    )
                                    return (
                                      <p style={{ margin: "4px 0 0" }}>
                                        🚗 Fahrzeug: {assignedVehicle
                                          ? `${assignedVehicle.kennzeichen} – ${assignedVehicle.hersteller_modell || assignedVehicle.fahrzeugtyp || "Fahrzeug"}`
                                          : "Noch nicht zugewiesen"}
                                        {assignedVehicle && (
                                          <>
                                            <br />
                                            <span style={{ fontSize: "13px" }}>
                                              {getVehicleStatusLabel(assignedVehicle.status)}
                                              {assignedVehicle.kilometerstand != null && ` · ${assignedVehicle.kilometerstand.toLocaleString("de-DE")} km`}
                                            </span>
                                          </>
                                        )}
                                      </p>
                                    )
                                  })()}
                                </div>
                                <div style={{ textAlign: "right", minWidth: "190px" }}>
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "8px 12px",
                                      borderRadius: "999px",
                                      background: `${trafficLight.color}18`,
                                      border: `2px solid ${trafficLight.color}`,
                                      color: trafficLight.color,
                                      fontWeight: 900,
                                    }}
                                  >
                                    <span style={{ fontSize: "16px" }}>{trafficLight.icon}</span>
                                    {trafficLight.label}
                                  </div>
                                  <div style={{ marginTop: "6px", fontWeight: 700 }}>
                                    Status: {statusLabel}
                                  </div>
                                  {stats.delayed > 0 && (
                                    <div style={{ marginTop: "4px", fontWeight: 600 }}>
                                      ⏰ {stats.delayed} verspätet
                                    </div>
                                  )}
                                </div>
                              </div>

                              {(() => {
                                const assignedVehicle = vehicles.find(
                                  (vehicleItem) => vehicleItem.id === item.fahrzeug_id
                                )
                                if (!assignedVehicle) {
                                  return (
                                    <div style={{ marginTop: "12px", padding: "10px 12px", borderRadius: "10px", background: "#fff7ed", border: "1px solid #fdba74", fontWeight: 800 }}>
                                      ⚠️ Für diese Tour ist noch kein Fahrzeug zugewiesen.
                                    </div>
                                  )
                                }
                                if (!isVehicleAvailableForTour(assignedVehicle)) {
                                  return (
                                    <div style={{ marginTop: "12px", padding: "10px 12px", borderRadius: "10px", background: "#fef2f2", border: "2px solid #ef4444", color: "#991b1b", fontWeight: 800 }}>
                                      ⚠️ Fahrzeug nicht einsatzbereit: {assignedVehicle.kennzeichen} – {getVehicleStatusLabel(assignedVehicle.status)}
                                    </div>
                                  )
                                }
                                return null
                              })()}

                              <div
                                style={{
                                  marginTop: "14px",
                                  padding: "12px 14px",
                                  borderRadius: "12px",
                                  background: stats.currentStatus === "Beim Kunden"
                                    ? "#fef3c7"
                                    : stats.currentStatus === "Unterwegs"
                                    ? "#dbeafe"
                                    : statusLabel === "Abgeschlossen"
                                    ? "#dcfce7"
                                    : "#f3f4f6",
                                  border: stats.currentStatus === "Beim Kunden"
                                    ? "2px solid #f59e0b"
                                    : stats.currentStatus === "Unterwegs"
                                    ? "2px solid #2563eb"
                                    : statusLabel === "Abgeschlossen"
                                    ? "2px solid #16a34a"
                                    : "1px solid #d1d5db",
                                }}
                              >
                                <div style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                  🔴 Live-Status
                                </div>
                                <div style={{ marginTop: "5px", fontSize: "16px", fontWeight: 900 }}>
                                  {stats.currentStatus === "Beim Kunden"
                                    ? `📍 Beim Kunden${stats.currentCustomer ? `: ${stats.currentCustomer}` : ""}`
                                    : stats.currentStatus === "Unterwegs"
                                    ? `🚚 Fahrer unterwegs${stats.currentCustomer ? ` zu ${stats.currentCustomer}` : ""}`
                                    : statusLabel === "Abgeschlossen"
                                    ? "✅ Tour abgeschlossen"
                                    : stats.total === 0
                                    ? "⚪ Noch keine Lieferungen"
                                    : "🟡 Tour wartet auf nächsten Schritt"}
                                </div>
                                <div style={{ marginTop: "6px", display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "13px", fontWeight: 700 }}>
                                  <span>Offen: {stats.open}</span>
                                  <span>Unterwegs: {stats.unterwegs}</span>
                                  <span>Beim Kunden: {stats.beimKunden}</span>
                                  <span>Erledigt: {stats.completed}</span>
                                </div>
                              </div>

                              <div style={{ marginTop: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                                  <span>Lieferfortschritt</span>
                                  <strong>{stats.completed} / {stats.total}</strong>
                                </div>
                                <div style={{ height: "10px", borderRadius: "999px", background: "#e5e7eb", overflow: "hidden" }}>
                                  <div
                                    style={{
                                      width: `${progress}%`,
                                      height: "100%",
                                      background: progress === 100 ? "#16a34a" : "#2563eb",
                                      transition: "width 0.2s ease",
                                    }}
                                  />
                                </div>
                                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "8px", fontSize: "14px" }}>
                                  <span>Offen: <strong>{stats.open}</strong></span>
                                  {stats.nextPlanned && <span>Nächste geplante Lieferung: <strong>{stats.nextPlanned} Uhr</strong></span>}
                                </div>

                                {stats.nextPlanned && (
                                  <div
                                    style={{
                                      marginTop: "12px",
                                      padding: "12px 14px",
                                      borderRadius: "10px",
                                      border: stats.delayed > 0 ? "2px solid #dc2626" : "1px solid #bfdbfe",
                                      background: stats.delayed > 0 ? "#fef2f2" : "#eff6ff",
                                    }}
                                  >
                                    <strong>⭐ Nächster Stopp</strong>
                                    <div style={{ marginTop: "5px", fontWeight: 800 }}>
                                      {stats.nextCustomer || "Kunde nicht angegeben"}
                                    </div>
                                    {stats.nextAddress && (
                                      <div style={{ marginTop: "3px" }}>📍 {stats.nextAddress}</div>
                                    )}
                                    <div style={{ marginTop: "5px" }}>
                                      🕒 {stats.nextPlanned} Uhr · Status: {stats.nextStatus || "Offen"}
                                    </div>
                                    {stats.delayed > 0 && (
                                      <div style={{ marginTop: "5px", color: "#991b1b", fontWeight: 900 }}>
                                        🔴 Mindestens eine Lieferung ist verspätet
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedTourId(item.id)
                                    setTour(item)
                                    loadDeliveries(item.id)
                                    setPage("tour")
                                  }}
                                >
                                  Tour öffnen
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedTourId(item.id)
                                    setTour(item)
                                    navigateTo("tour-management")
                                  }}
                                >
                                  Tour verwalten
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </section>
        )}

        {page === "driver-management" && hasPermission("fahrer") && (
          <section>
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
                <div><h2>Fahrer & Personal</h2><p>Fahrerdaten, Führerscheinfristen und Leistungsübersicht.</p></div>
                <button type="button" className="secondary-button" onClick={async()=>{await loadDriverProfiles(); await loadDriverStats()}}>↻ Aktualisieren</button>
              </div>
              {driverProfileError && <div className="error-message">{driverProfileError}</div>}
              {driverProfileMessage && <div className="success-message">{driverProfileMessage}</div>}
              {driverProfileLoading ? <p>Fahrer werden geladen…</p> : driverProfiles.map((driver) => {
                const stats=driverStats[driver.id]||{touren:0,erledigteTouren:0,lieferungen:0,erledigteLieferungen:0,verspaeteteLieferungen:0,kilometer:0}
                const expiry=driver.fuehrerschein_gueltig_bis
                const days=expiry?Math.ceil((new Date(expiry+"T00:00:00").getTime()-new Date(getToday()+"T00:00:00").getTime())/86400000):null
                return <div key={driver.id} style={{border:"1px solid #ddd",borderRadius:"12px",padding:"16px",marginTop:"12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}><div><strong style={{fontSize:"18px"}}>{driver.name||driver.email}</strong><div>{driver.email}</div><div>{driver.telefon||"Keine Telefonnummer"}</div></div><span className={driver.aktiv?"status-badge active":"status-badge inactive"}>{driver.aktiv?"🟢 Aktiv":"🔴 Inaktiv"}</span></div>
                  <div style={{marginTop:"10px",display:"flex",gap:"8px",flexWrap:"wrap"}}><span className="status-badge">🚚 {stats.touren} Touren</span><span className="status-badge">📦 {stats.erledigteLieferungen}/{stats.lieferungen} Lieferungen</span><span className="status-badge">🛣️ {stats.kilometer} km</span><span className={stats.verspaeteteLieferungen>0?"status-badge urgent":"status-badge"}>⏰ {stats.verspaeteteLieferungen} verspätet</span></div>
                  <div style={{marginTop:"10px"}}><strong>Führerschein:</strong> {driver.fuehrerscheinnummer||"nicht hinterlegt"} · gültig bis {expiry||"nicht hinterlegt"}{days!=null&&days<0&&<span style={{color:"#b91c1c",fontWeight:800}}> · 🔴 abgelaufen</span>}{days!=null&&days>=0&&days<=30&&<span style={{color:"#b45309",fontWeight:800}}> · 🟠 läuft in {days} Tagen ab</span>}</div>
                  <button type="button" className="secondary-button" style={{marginTop:"12px"}} onClick={()=>setDriverEdit({...driver})}>✏️ Fahrer bearbeiten</button>
                </div>
              })}
              {driverProfiles.length===0&&!driverProfileLoading&&<p>Keine Fahrer vorhanden.</p>}
            </div>
            {driverEdit&&<div className="card"><h3>Fahrer bearbeiten</h3><div style={{display:"grid",gap:"10px",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))"}}>
              <label>Name<input value={driverEdit.name} onChange={e=>setDriverEdit({...driverEdit,name:e.target.value})}/></label>
              <label>Telefon<input value={driverEdit.telefon} onChange={e=>setDriverEdit({...driverEdit,telefon:e.target.value})}/></label>
              <label>Führerscheinnummer<input value={driverEdit.fuehrerscheinnummer} onChange={e=>setDriverEdit({...driverEdit,fuehrerscheinnummer:e.target.value})}/></label>
              <label>Führerschein gültig bis<input type="date" value={driverEdit.fuehrerschein_gueltig_bis} onChange={e=>setDriverEdit({...driverEdit,fuehrerschein_gueltig_bis:e.target.value})}/></label>
              <label style={{display:"flex",alignItems:"center",gap:"8px"}}><input type="checkbox" checked={driverEdit.aktiv} onChange={e=>setDriverEdit({...driverEdit,aktiv:e.target.checked})}/> Fahrer aktiv</label>
            </div><div style={{marginTop:"12px",display:"flex",gap:"8px"}}><button type="button" className="primary-button" onClick={saveDriverProfile}>Speichern</button><button type="button" className="secondary-button" onClick={()=>setDriverEdit(null)}>Abbrechen</button></div></div>}
          </section>
        )}

        {page === "work-time" && hasPermission("fahrer") && (
          <section>
            <div className="card"><h2>Arbeitszeit & Kilometer</h2><p>Arbeitszeiten und gefahrene Kilometer pro Fahrer erfassen.</p>{workMessage&&<div className="success-message">{workMessage}</div>}
              <div style={{display:"grid",gap:"10px",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))"}}>
                <label>Fahrer<select value={workDriverId} onChange={e=>setWorkDriverId(e.target.value)}><option value="">Fahrer auswählen…</option>{driverProfiles.filter(d=>d.aktiv).map(d=><option key={d.id} value={d.id}>{d.name||d.email}</option>)}</select></label>
                <label>Datum<input type="date" value={workDate} onChange={e=>setWorkDate(e.target.value)}/></label>
                <label>Arbeitsbeginn<input type="time" value={workStart} onChange={e=>setWorkStart(e.target.value)}/></label>
                <label>Arbeitsende<input type="time" value={workEnd} onChange={e=>setWorkEnd(e.target.value)}/></label>
                <label>Pause (Minuten)<input type="number" min="0" value={workBreak} onChange={e=>setWorkBreak(e.target.value)}/></label>
                <label>Notiz<input value={workNote} onChange={e=>setWorkNote(e.target.value)}/></label>
              </div>
              <button type="button" className="primary-button" style={{marginTop:"12px"}} onClick={saveWorkEntry}>Arbeitszeit speichern</button>
            </div>
            <div className="card"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3>Arbeitszeit-Historie</h3><button type="button" className="secondary-button" onClick={loadWorkEntries}>↻ Aktualisieren</button></div>
              {workLoading?<p>Arbeitszeiten werden geladen…</p>:workEntries.map(entry=>{const driver=driverProfiles.find(d=>d.id===entry.fahrer_id);return <div key={entry.id} style={{borderTop:"1px solid #ddd",padding:"10px 0"}}><strong>{driver?.name||driver?.email||entry.fahrer_id}</strong><div>{entry.datum} · {entry.arbeitsbeginn}–{entry.arbeitsende||"offen"} · Pause {entry.pause_minuten} min · <strong>{formatMinutes(workMinutes(entry))}</strong></div>{entry.notiz&&<div>{entry.notiz}</div>}</div>})}
              {workEntries.length===0&&!workLoading&&<p>Noch keine Arbeitszeiten erfasst.</p>}
            </div>
            <div className="card"><h3>Tour-Kilometer Übersicht</h3><p>Start- und Endkilometer je Tour.</p>{tours.filter((t:any)=>t.km_start!=null||t.km_ende!=null).map((t:any)=>{const km=t.km_start!=null&&t.km_ende!=null&&t.km_ende>=t.km_start?t.km_ende-t.km_start:null;return <div key={t.id} style={{borderTop:"1px solid #ddd",padding:"9px 0"}}><strong>{t.tournummer}</strong> · {formatTourDate(t.datum)} · {t.fahrer||"kein Fahrer"} · Start {t.km_start??"—"} · Ende {t.km_ende??"—"} · <strong>{km!=null?`${km} km`:"unvollständig"}</strong></div>})}</div>
          </section>
        )}

        {page === "documents" && (
          <section>
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                <div>
                  <h2>📁 Dokumente & Unterlagen</h2>
                  <p style={{marginBottom:0}}>Fahrzeug- und Fahrerdokumente sicher verwalten.</p>
                </div>
                <button type="button" className="secondary-button" onClick={loadDocuments} disabled={documentLoading}>
                  {documentLoading ? "Wird geladen…" : "↻ Aktualisieren"}
                </button>
              </div>

              {documentError && <div className="error-message" style={{marginTop:"12px"}}>{documentError}</div>}
              {documentMessage && <div className="success-message" style={{marginTop:"12px"}}>{documentMessage}</div>}

              <div style={{marginTop:"16px",padding:"16px",border:"1px solid #ddd",borderRadius:"12px"}}>
                <h3>Dokument hochladen</h3>
                <div style={{display:"grid",gap:"10px",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))"}}>
                  {currentUser.rolle !== "Fahrer" ? (
                    <label>Fahrzeug
                      <select value={documentVehicleId} onChange={e=>{setDocumentVehicleId(e.target.value); if(e.target.value) setDocumentDriverId("")}}>
                        <option value="">Kein Fahrzeug</option>
                        {vehicles.map(v=><option key={v.id} value={v.id}>{v.kennzeichen} · {v.fahrzeugtyp || "Fahrzeug"}</option>)}
                      </select>
                    </label>
                  ) : null}

                  {currentUser.rolle !== "Fahrer" ? (
                    <label>Fahrer
                      <select value={documentDriverId} onChange={e=>{setDocumentDriverId(e.target.value); if(e.target.value) setDocumentVehicleId("")}}>
                        <option value="">Kein Fahrer</option>
                        {driverProfiles.filter(d=>d.aktiv).map(d=><option key={d.id} value={d.id}>{d.name || d.email}</option>)}
                      </select>
                    </label>
                  ) : (
                    <label>Fahrer
                      <input value={currentUser.name || currentUser.email} disabled />
                    </label>
                  )}

                  <label>Dokumenttyp
                    <select value={documentType} onChange={e=>setDocumentType(e.target.value)}>
                      <option>Fahrzeugschein</option>
                      <option>Fahrzeugbrief</option>
                      <option>HU/AU</option>
                      <option>Versicherung</option>
                      <option>Wartungsnachweis</option>
                      <option>Führerschein</option>
                      <option>Sonstiges</option>
                    </select>
                  </label>

                  <label>Ablaufdatum
                    <input type="date" value={documentExpiry} onChange={e=>setDocumentExpiry(e.target.value)} />
                  </label>

                  <label style={{gridColumn:"1 / -1"}}>Notiz
                    <input value={documentNote} onChange={e=>setDocumentNote(e.target.value)} placeholder="Optionale Notiz" />
                  </label>

                  <label style={{gridColumn:"1 / -1"}}>Datei
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e=>setDocumentFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div style={{marginTop:"10px",display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
                  <button type="button" className="primary-button" onClick={uploadDocument} disabled={documentUploading}>
                    {documentUploading ? "Wird hochgeladen…" : "📤 Dokument hochladen"}
                  </button>
                  {documentFile && <span>{documentFile.name} · {(documentFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                <h3>Gespeicherte Dokumente</h3>
                <label style={{minWidth:"210px"}}>Filter
                  <select value={documentFilter} onChange={e=>setDocumentFilter(e.target.value)}>
                    <option>Alle</option>
                    <option>Fahrzeugdokumente</option>
                    <option>Fahrerdokumente</option>
                    <option>Ablaufwarnungen</option>
                  </select>
                </label>
              </div>

              {documentLoading ? <p>Dokumente werden geladen…</p> : (() => {
                const filtered = documentRows.filter(doc => {
                  if (documentFilter === "Fahrzeugdokumente") return doc.fahrzeug_id != null
                  if (documentFilter === "Fahrerdokumente") return doc.fahrer_id != null
                  if (documentFilter === "Ablaufwarnungen") return isDocumentExpired(doc.ablaufdatum) || isDocumentExpiringSoon(doc.ablaufdatum)
                  return true
                })
                if (filtered.length === 0) return <p>Keine Dokumente vorhanden.</p>
                return filtered.map(doc => {
                  const expired = isDocumentExpired(doc.ablaufdatum)
                  const soon = isDocumentExpiringSoon(doc.ablaufdatum)
                  return <div key={doc.id} style={{borderTop:"1px solid #ddd",padding:"14px 0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
                      <div>
                        <strong style={{fontSize:"17px"}}>📄 {doc.dateiname}</strong>
                        <div style={{marginTop:"4px"}}><strong>Typ:</strong> {doc.dokumenttyp}</div>
                        <div><strong>Zuordnung:</strong> {doc.fahrzeug_id != null ? getDocumentVehicleLabel(doc.fahrzeug_id) : getDocumentDriverLabel(doc.fahrer_id)}</div>
                        <div><strong>Ablauf:</strong> {doc.ablaufdatum || "kein Ablaufdatum"}</div>
                        {doc.notiz && <div><strong>Notiz:</strong> {doc.notiz}</div>}
                      </div>
                      <div style={{display:"flex",gap:"8px",alignItems:"flex-start",flexWrap:"wrap"}}>
                        {expired && <span className="status-badge urgent">🔴 Abgelaufen</span>}
                        {!expired && soon && <span className="status-badge" style={{background:"#fff7ed",color:"#b45309"}}>🟠 Läuft bald ab</span>}
                        <button type="button" className="secondary-button" onClick={()=>openDocument(doc)}>👁️ Öffnen</button>
                        <button type="button" className="secondary-button" onClick={()=>deleteDocument(doc)}>🗑️ Löschen</button>
                      </div>
                    </div>
                  </div>
                })
              })()}
            </div>
          </section>
        )}

        {page === "warnings" && hasPermission("warnungen") && (
          <section>
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                <div>
                  <h2>🔔 Zentrale Warnungen</h2>
                  <p style={{marginBottom:0}}>Alle wichtigen Hinweise aus Dokumenten, Wartungen, Mängeln, Führerscheinen und Lieferungen.</p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadCentralWarnings}
                  disabled={warningsLoading}
                >
                  {warningsLoading ? "Wird geladen…" : "↻ Aktualisieren"}
                </button>
              </div>

              {warningsError && <div className="error-message" style={{marginTop:"12px"}}>{warningsError}</div>}

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"10px",marginTop:"16px"}}>
                <div className="card" style={{margin:0,padding:"12px",border:"1px solid #fecaca"}}>
                  <strong>🔴 Dringend</strong>
                  <div style={{fontSize:"28px",fontWeight:700}}>{centralWarnings.filter(w=>w.priority==="dringend").length}</div>
                </div>
                <div className="card" style={{margin:0,padding:"12px",border:"1px solid #fed7aa"}}>
                  <strong>🟠 Wichtig</strong>
                  <div style={{fontSize:"28px",fontWeight:700}}>{centralWarnings.filter(w=>w.priority==="wichtig").length}</div>
                </div>
                <div className="card" style={{margin:0,padding:"12px",border:"1px solid #fde68a"}}>
                  <strong>🟡 Hinweise</strong>
                  <div style={{fontSize:"28px",fontWeight:700}}>{centralWarnings.filter(w=>w.priority==="hinweis").length}</div>
                </div>
              </div>

              {warningsLoading && <p style={{marginTop:"18px"}}>Warnungen werden geladen…</p>}

              {!warningsLoading && centralWarnings.length === 0 && (
                <div className="success-message" style={{marginTop:"18px"}}>
                  ✓ Aktuell keine offenen Warnungen.
                </div>
              )}

              {!warningsLoading && centralWarnings.length > 0 && (
                <div style={{marginTop:"18px"}}>
                  {centralWarnings.map((warning) => (
                    <button
                      key={warning.id}
                      type="button"
                      onClick={() => navigateTo(warning.page)}
                      style={{
                        width:"100%",
                        textAlign:"left",
                        border:"1px solid #e5e7eb",
                        borderRadius:"12px",
                        padding:"14px",
                        marginBottom:"10px",
                        background: warning.priority === "dringend" ? "#fef2f2" : warning.priority === "wichtig" ? "#fff7ed" : "#fffbeb",
                        cursor:"pointer",
                      }}
                    >
                      <div style={{display:"flex",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
                        <strong>{warning.icon} {warning.title}</strong>
                        <span>{warning.priority === "dringend" ? "🔴 Dringend" : warning.priority === "wichtig" ? "🟠 Wichtig" : "🟡 Hinweis"}</span>
                      </div>
                      <div style={{marginTop:"5px"}}>{warning.detail}</div>
                      <div style={{marginTop:"7px",fontSize:"13px",fontWeight:600}}>→ Passenden Bereich öffnen</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {page === "reports" && (
          <section>
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                <div>
                  <h2>📊 Auswertung</h2>
                  <p style={{marginBottom:0}}>Touren, Lieferungen, Kilometer und Arbeitszeit im gewählten Zeitraum.</p>
                </div>
                <button type="button" className="secondary-button" onClick={loadReportData} disabled={reportLoading}>
                  {reportLoading ? "Wird geladen…" : "↻ Aktualisieren"}
                </button>
              </div>
              {reportError && <div className="error-message" style={{marginTop:"12px"}}>{reportError}</div>}
              <div style={{display:"grid",gap:"10px",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",marginTop:"16px"}}>
                <label>Von<input type="date" value={reportStart} onChange={e=>setReportStart(e.target.value)}/></label>
                <label>Bis<input type="date" value={reportEnd} onChange={e=>setReportEnd(e.target.value)}/></label>
                {canManageTours && <label>Fahrer<select value={reportDriverId} onChange={e=>setReportDriverId(e.target.value)}><option value="">Alle Fahrer</option>{driverProfiles.filter(d=>d.aktiv).map(d=><option key={d.id} value={d.id}>{d.name||d.email}</option>)}</select></label>}
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"12px"}}>
                <button type="button" className="primary-button" onClick={loadReportData}>Auswertung laden</button>
                <button type="button" className="secondary-button" onClick={downloadReportCsv} disabled={reportLoading}>📄 CSV exportieren</button>
                <button type="button" className="secondary-button" onClick={downloadReportPdf} disabled={reportLoading}>📑 PDF exportieren</button>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"12px"}}>
              {[
                ["🚚","Touren",reportStats.tours],
                ["✅","Abgeschlossene Touren",reportStats.completedTours],
                ["📦","Lieferungen",reportStats.deliveries],
                ["✔️","Erledigte Lieferungen",reportStats.completedDeliveries],
                ["⚠️","Verspätete Lieferungen",reportStats.delayedDeliveries],
                ["🛣️","Kilometer",`${reportStats.kilometers} km`],
                ["⏱️","Arbeitszeit",formatMinutes(reportStats.workMinutes)],
              ].map(([icon,label,value])=>(
                <div className="card" key={String(label)}>
                  <div style={{fontSize:"26px"}}>{icon}</div>
                  <strong>{label}</strong>
                  <div style={{fontSize:"25px",fontWeight:800,marginTop:"5px"}}>{reportLoading ? "…" : value}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3>Touren im Zeitraum</h3>
              {reportTourRows.length === 0 ? <p>Keine Touren im gewählten Zeitraum.</p> : reportTourRows.map((t:any)=>{
                const km=t.km_start!=null&&t.km_ende!=null&&Number(t.km_ende)>=Number(t.km_start)?Number(t.km_ende)-Number(t.km_start):null
                return <div key={t.id} style={{borderTop:"1px solid #ddd",padding:"11px 0"}}>
                  <strong>{t.tournummer}</strong> · {formatTourDate(t.datum)} · {t.fahrer||"kein Fahrer"} · Status: {t.status||"Offen"} · {km!=null?`${km} km`:"km unvollständig"}
                </div>
              })}
            </div>
          </section>
        )}

        {page === "fleet" && hasPermission("fahrzeuge") && (
          <section>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <h2>Fahrzeugverwaltung</h2>
                  <p style={{ marginBottom: 0 }}>Übersicht über Fahrzeuge, Kilometerstand, letzten Fahrzeugcheck und offene Mängel.</p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" className="primary-button" onClick={openVehicleCreate}>
                    ＋ Fahrzeug anlegen
                  </button>
                  <button type="button" className="secondary-button" onClick={loadFleetOverview} disabled={fleetLoading}>
                    {fleetLoading ? "Wird geladen..." : "↻ Aktualisieren"}
                  </button>
                </div>
              </div>
            </div>

            {fleetError && (
              <div className="card"><p className="warning">Fahrzeugübersicht konnte nicht geladen werden: {fleetError}</p></div>
            )}

            {fleetLoading && !fleetError && (
              <div className="card"><p>Fahrzeuge werden geladen...</p></div>
            )}

            {!fleetLoading && !fleetError && fleetVehicles.length === 0 && (
              <div className="card"><p>Keine Fahrzeuge vorhanden.</p></div>
            )}

            {!fleetLoading && !fleetError && fleetVehicles.map((item) => {
              const checkPassed = item.lastCheck?.status === "Bestanden"
              const vehicleActive = item.status.trim().toLowerCase() === "aktiv"
              return (
                <div className="card" key={item.id} style={{ border: item.openDefects > 0 ? "2px solid #dc2626" : undefined }}>
                  <div className="delivery-header">
                    <div>
                      <span className="delivery-number">{item.kennzeichen || "Ohne Kennzeichen"}</span>
                      <h3>{item.hersteller_modell || item.fahrzeugtyp || "Fahrzeug"}</h3>
                      <p>Fahrzeug-ID: {item.id}</p>
                    </div>
                    <div className="delivery-status">{item.status || "Status unbekannt"}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginTop: "14px" }}>
                    <div><strong>Kilometerstand</strong><div>{item.kilometerstand != null ? `${item.kilometerstand.toLocaleString("de-DE")} km` : "Nicht angegeben"}</div></div>
                    <div><strong>Baujahr</strong><div>{item.baujahr || "Nicht angegeben"}</div></div>
                    <div><strong>Kraftstoff</strong><div>{item.kraftstoffart || "Nicht angegeben"}</div></div>
                    <div><strong>Fahrzeugstatus</strong><div>{vehicleActive ? "🟢 Aktiv" : `⚠️ ${item.status || "Unbekannt"}`}</div></div>
                    <div><strong>Letzter Fahrzeugcheck</strong><div>{item.lastCheck ? `${formatCheckDate(item.lastCheck.datum)} · ${item.lastCheck.status || "Unbekannt"}` : "Noch kein Check"}</div></div>
                    <div><strong>Letzte Wartung</strong><div>{item.lastMaintenance ? `${item.lastMaintenance.wartungsart} · ${formatCheckDate(item.lastMaintenance.datum)}` : "Noch keine Wartung"}</div></div>
                    <div><strong>Wartungsstatus</strong><div style={{ fontWeight: 900, color: maintenanceState(item).tone === "danger" ? "#dc2626" : maintenanceState(item).tone === "warning" ? "#b45309" : "#15803d" }}>{maintenanceState(item).label}</div></div>
                    <div><strong>Offene Mängel</strong><div style={{ fontWeight: 900, color: item.openDefects > 0 ? "#dc2626" : "inherit" }}>{item.openDefects}</div></div>
                  </div>

                  <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openFleetEdit(item)}
                    >
                      ✏️ Fahrzeugdaten bearbeiten
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openVehicleDelete(item)}
                      style={{ borderColor: "#dc2626", color: "#b91c1c" }}
                    >
                      🗑️ Fahrzeug löschen
                    </button>
                    <button type="button" className="secondary-button" onClick={() => openMaintenance(item)}>
                      🔧 Wartung eintragen
                    </button>
                    <button type="button" className="secondary-button" onClick={() => openFleetDetail(item)}>
                      📋 Fahrzeugakte
                    </button>

                    {item.openDefects > 0 ? (
                      <p className="warning" style={{ marginBottom: 0 }}>🔴 Fahrzeug hat offene Mängel. Vor Einsatz prüfen.</p>
                    ) : checkPassed ? (
                      <p className="success" style={{ marginBottom: 0 }}>✓ Letzter gespeicherter Fahrzeugcheck bestanden.</p>
                    ) : (
                      <p className="warning" style={{ marginBottom: 0 }}>⚠️ Kein bestandener Fahrzeugcheck als letzter Check gespeichert.</p>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        )}


        {vehicleCreateOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1002 }}>
            <div className="card" style={{ width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <h2 style={{ marginBottom: "4px" }}>Fahrzeug anlegen</h2>
                  <p style={{ marginBottom: 0 }}>Neues Fahrzeug direkt in der App erfassen.</p>
                </div>
                <button type="button" className="secondary-button" onClick={closeVehicleCreate} disabled={vehicleCreateSaving}>Schließen</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginTop: "20px" }}>
                <div><label htmlFor="vehicle-create-kennzeichen">Kennzeichen *</label><input id="vehicle-create-kennzeichen" type="text" value={vehicleCreateKennzeichen} onChange={(e) => setVehicleCreateKennzeichen(e.target.value)} placeholder="z. B. OFAK9027" /></div>
                <div><label htmlFor="vehicle-create-typ">Fahrzeugtyp</label><select id="vehicle-create-typ" value={vehicleCreateTyp} onChange={(e) => setVehicleCreateTyp(e.target.value)}><option>Transporter</option><option>PKW</option><option>LKW</option><option>Sprinter</option><option>Anhänger</option><option>Sonstiges</option></select></div>
                <div><label htmlFor="vehicle-create-modell">Hersteller / Modell *</label><input id="vehicle-create-modell" type="text" value={vehicleCreateModell} onChange={(e) => setVehicleCreateModell(e.target.value)} placeholder="z. B. VW Caddy" /></div>
                <div><label htmlFor="vehicle-create-baujahr">Baujahr</label><input id="vehicle-create-baujahr" type="text" inputMode="numeric" value={vehicleCreateBaujahr} onChange={(e) => setVehicleCreateBaujahr(e.target.value)} placeholder="z. B. 2024" /></div>
                <div><label htmlFor="vehicle-create-km">Kilometerstand</label><input id="vehicle-create-km" type="text" inputMode="numeric" value={vehicleCreateKm} onChange={(e) => setVehicleCreateKm(e.target.value)} placeholder="z. B. 82500" /></div>
                <div><label htmlFor="vehicle-create-verbrauch">Verbrauch (l/100 km)</label><input id="vehicle-create-verbrauch" type="text" inputMode="decimal" value={vehicleCreateVerbrauch} onChange={(e) => setVehicleCreateVerbrauch(e.target.value)} placeholder="z. B. 6,0" /></div>
                <div><label htmlFor="vehicle-create-kraftstoff">Kraftstoff</label><select id="vehicle-create-kraftstoff" value={vehicleCreateKraftstoff} onChange={(e) => setVehicleCreateKraftstoff(e.target.value)}><option>Diesel</option><option>Benzin</option><option>Hybrid</option><option>Elektro</option><option>Sonstiges</option></select></div>
                <div><label htmlFor="vehicle-create-status">Status</label><select id="vehicle-create-status" value={vehicleCreateStatus} onChange={(e) => setVehicleCreateStatus(e.target.value)}><option>Aktiv</option><option>Werkstatt</option><option>Außer Betrieb</option></select></div>
              </div>

              {vehicleCreateMessage && <p className={vehicleCreateMessage.startsWith("✓") ? "success" : "warning"} style={{ marginTop: "16px" }}>{vehicleCreateMessage}</p>}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px", flexWrap: "wrap" }}>
                <button type="button" className="secondary-button" onClick={closeVehicleCreate} disabled={vehicleCreateSaving}>Abbrechen</button>
                <button type="button" className="primary-button" onClick={saveNewVehicle} disabled={vehicleCreateSaving}>{vehicleCreateSaving ? "Wird angelegt..." : "Fahrzeug anlegen"}</button>
              </div>
            </div>
          </div>
        )}

        {vehicleDeleteTarget && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1003 }}>
            <div className="card" style={{ width: "100%", maxWidth: "520px" }}>
              <h2>Fahrzeug löschen?</h2>
              <p>
                Soll das Fahrzeug <strong>{vehicleDeleteTarget.kennzeichen}</strong>
                {vehicleDeleteTarget.hersteller_modell ? ` (${vehicleDeleteTarget.hersteller_modell})` : ""} wirklich gelöscht werden?
              </p>
              <p className="warning">⚠️ Das Löschen kann nicht rückgängig gemacht werden. Wenn das Fahrzeug noch einer Tour zugeordnet ist, wird das Löschen von der Datenbank verhindert.</p>
              {vehicleDeleteMessage && <p className="warning">{vehicleDeleteMessage}</p>}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px", flexWrap: "wrap" }}>
                <button type="button" className="secondary-button" onClick={closeVehicleDelete} disabled={vehicleDeleteSaving}>Abbrechen</button>
                <button type="button" className="primary-button" onClick={deleteVehicle} disabled={vehicleDeleteSaving} style={{ background: "#dc2626" }}>{vehicleDeleteSaving ? "Wird gelöscht..." : "🗑️ Endgültig löschen"}</button>
              </div>
            </div>
          </div>
        )}

        {fleetDetailVehicle && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 1004,
            }}
          >
            <div
              className="card"
              style={{
                width: "100%",
                maxWidth: "980px",
                maxHeight: "92vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div>
                  <h2 style={{ marginBottom: "4px" }}>📋 Fahrzeugakte</h2>
                  <p style={{ marginBottom: 0, fontWeight: 800 }}>
                    {fleetDetailVehicle.kennzeichen} · {fleetDetailVehicle.hersteller_modell || fleetDetailVehicle.fahrzeugtyp || "Fahrzeug"}
                  </p>
                </div>
                <button type="button" className="secondary-button" onClick={closeFleetDetail}>Schließen</button>
              </div>

              {fleetDetailError && <p className="warning" style={{ marginTop: "14px" }}>{fleetDetailError}</p>}
              {fleetDetailLoading && <p style={{ marginTop: "14px" }}>Fahrzeughistorie wird geladen...</p>}

              {!fleetDetailLoading && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginTop: "18px" }}>
                    <div className="card"><strong>Status</strong><div>{getVehicleStatusLabel(fleetDetailVehicle.status)}</div></div>
                    <div className="card"><strong>Kilometerstand</strong><div>{fleetDetailVehicle.kilometerstand != null ? `${fleetDetailVehicle.kilometerstand.toLocaleString("de-DE")} km` : "—"}</div></div>
                    <div className="card"><strong>Baujahr</strong><div>{fleetDetailVehicle.baujahr || "—"}</div></div>
                    <div className="card"><strong>Touren</strong><div>{fleetDetailVehicle.tourCount}</div></div>
                    <div className="card"><strong>Wartungskosten gesamt</strong><div>{fleetDetailVehicle.maintenanceTotalCost.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</div></div>
                    <div className="card"><strong>Fixkosten / Monat</strong><div>{((fleetDetailVehicle.versicherung_monat || 0) + (fleetDetailVehicle.steuer_monat || 0)).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</div></div>
                    <div className="card"><strong>Letzter Check</strong><div>{fleetDetailVehicle.lastCheck ? `${formatCheckDate(fleetDetailVehicle.lastCheck.datum)} · ${fleetDetailVehicle.lastCheck.status || "—"}` : "Noch keiner"}</div></div>
                    <div className="card"><strong>Wartungsstatus</strong><div>{fleetDetailMaintenanceState(fleetDetailVehicle).label}</div></div>
                  </div>

                  <div className="card" style={{ marginTop: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0 }}>🔧 Wartungshistorie</h3>
                      <button type="button" className="secondary-button" onClick={() => { closeFleetDetail(); openMaintenance(fleetDetailVehicle) }}>＋ Wartung eintragen</button>
                    </div>
                    {fleetDetailVehicle.maintenanceHistory.length === 0 ? <p>Noch keine Wartungen gespeichert.</p> : (
                      fleetDetailVehicle.maintenanceHistory.map((m) => (
                        <div key={m.id} style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "8px" }}>
                          <div><strong>{m.wartungsart}</strong><div>{formatCheckDate(m.datum)}</div></div>
                          <div><strong>Kilometer</strong><div>{m.kilometerstand != null ? `${m.kilometerstand.toLocaleString("de-DE")} km` : "—"}</div></div>
                          <div><strong>Kosten</strong><div>{String(m.status || "Offen") === "Erledigt" ? (Number(m.tatsaechliche_kosten) || 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"}) : (Number(m.kosten) || 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</div></div>
                          <div><strong>Nächster Termin</strong><div>{m.naechste_wartung_datum ? formatCheckDate(m.naechste_wartung_datum) : "—"}{m.naechste_wartung_km != null ? ` · ${m.naechste_wartung_km.toLocaleString("de-DE")} km` : ""}</div></div>
                          <div><strong>Notiz</strong><div>{m.notiz || "—"}</div></div>
                          <div><strong>Status</strong><div>{String(m.status || "Offen") === "Erledigt" ? "🟢 Erledigt" : "🟠 Offen"}</div></div>
                          <div style={{ display: "flex", alignItems: "end" }}>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => openMaintenanceEdit(m)}
                              >
                                ✏️ Bearbeiten
                              </button>
                              {String(m.status || "Offen") !== "Erledigt" ? (
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={() => openMaintenanceCompletion(m.id)}
                                >
                                  ✓ Als erledigt markieren
                                </button>
                              ) : (
                                <span className="success" style={{ fontWeight: 800 }}>✓ Wartung abgeschlossen</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="card" style={{ marginTop: "14px" }}>
                    <h3>🛠️ Fahrzeugcheck-Historie</h3>
                    {fleetDetailVehicle.checkHistory.length === 0 ? <p>Noch keine Fahrzeugchecks gespeichert.</p> : (
                      fleetDetailVehicle.checkHistory.map((c) => (
                        <div key={c.id} style={{ borderTop: "1px solid #e5e7eb", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                          <span>{formatCheckDate(c.datum)} · {c.fahrer || "Unbekannt"}</span>
                          <strong className={c.status === "Bestanden" ? "success" : "warning"} style={{ padding: "4px 8px" }}>{c.status || "Unbekannt"}</strong>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="card" style={{ marginTop: "14px" }}>
                    <h3>💶 Fahrzeugkosten</h3>
                    <p>Versicherung: {(fleetDetailVehicle.versicherung_monat || 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"})} / Monat</p>
                    <p>Steuer: {(fleetDetailVehicle.steuer_monat || 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"})} / Monat</p>
                    <p>Wartungen bisher: {fleetDetailVehicle.maintenanceTotalCost.toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p>
                    <p><strong>Fixkosten pro Jahr:</strong> {(((fleetDetailVehicle.versicherung_monat || 0) + (fleetDetailVehicle.steuer_monat || 0)) * 12).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {maintenanceCompletionId !== null && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1100 }}>
            <div className="card" style={{ width: "100%", maxWidth: "460px" }}>
              <h2 style={{ marginTop: 0, marginBottom: "8px" }}>Wartung abschließen</h2>
              <p style={{ marginTop: 0, color: "#6b7280" }}>Bitte gib die tatsächlich bezahlten Kosten ein. Die geplanten Kosten bleiben nur für die offene Wartung gespeichert.</p>
              <label htmlFor="maintenance-actual-cost">Tatsächliche Kosten (€)</label>
              <input
                id="maintenance-actual-cost"
                type="text"
                inputMode="decimal"
                autoFocus
                value={maintenanceActualCost}
                onChange={(e) => setMaintenanceActualCost(e.target.value)}
                placeholder="z. B. 327,50"
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px", flexWrap: "wrap" }}>
                <button type="button" className="secondary-button" onClick={closeMaintenanceCompletion} disabled={maintenanceCompletionSaving}>Abbrechen</button>
                <button type="button" className="primary-button" onClick={completeMaintenance} disabled={maintenanceCompletionSaving}>
                  {maintenanceCompletionSaving ? "Wird abgeschlossen..." : "Wartung abschließen"}
                </button>
              </div>
            </div>
          </div>
        )}

        {maintenanceVehicle && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1200 }}>
            <div className="card" style={{ width: "100%", maxWidth: "620px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <h2 style={{ marginBottom: "4px" }}>{maintenanceEditId != null ? "Wartung bearbeiten" : "Wartung eintragen"}</h2>
                  <p style={{ marginBottom: 0 }}>{maintenanceVehicle.kennzeichen} · {maintenanceVehicle.hersteller_modell || maintenanceVehicle.fahrzeugtyp || "Fahrzeug"}</p>
                </div>
                <button type="button" className="secondary-button" onClick={closeMaintenance} disabled={maintenanceSaving}>Schließen</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginTop: "20px" }}>
                <div><label htmlFor="maintenance-date">Wartungsdatum</label><input id="maintenance-date" type="date" value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} /></div>
                <div><label htmlFor="maintenance-km">Kilometerstand</label><input id="maintenance-km" type="text" inputMode="numeric" value={maintenanceKm} onChange={(e) => setMaintenanceKm(e.target.value)} placeholder="z. B. 82500" /></div>
                <div><label htmlFor="maintenance-type">Wartungsart</label><select id="maintenance-type" value={maintenanceType} onChange={(e) => setMaintenanceType(e.target.value)}><option>Inspektion</option><option>Ölwechsel</option><option>Reifen</option><option>Bremsen</option><option>HU/AU</option><option>Reparatur</option><option>Sonstiges</option></select></div>
                <div><label htmlFor="maintenance-cost">Geplante Kosten (€)</label><input id="maintenance-cost" type="text" inputMode="decimal" value={maintenanceCost} onChange={(e) => setMaintenanceCost(e.target.value)} placeholder="z. B. 350" /></div>
                {maintenanceEditId != null && maintenanceEditStatus === "Erledigt" && (
                  <div><label htmlFor="maintenance-edit-actual-cost">Tatsächliche Kosten (€)</label><input id="maintenance-edit-actual-cost" type="text" inputMode="decimal" value={maintenanceEditActualCost} onChange={(e) => setMaintenanceEditActualCost(e.target.value)} placeholder="z. B. 327,50" /></div>
                )}
                <div><label htmlFor="next-maintenance-km">Nächste Wartung bei km</label><input id="next-maintenance-km" type="text" inputMode="numeric" value={nextMaintenanceKm} onChange={(e) => setNextMaintenanceKm(e.target.value)} placeholder="z. B. 92500" /></div>
                <div><label htmlFor="next-maintenance-date">Nächster Wartungstermin</label><input id="next-maintenance-date" type="date" value={nextMaintenanceDate} onChange={(e) => setNextMaintenanceDate(e.target.value)} /></div>
              </div>
              <div style={{ marginTop: "14px" }}><label htmlFor="maintenance-note">Notiz</label><textarea id="maintenance-note" value={maintenanceNote} onChange={(e) => setMaintenanceNote(e.target.value)} rows={4} placeholder="z. B. Öl, Filter und Bremsen geprüft" /></div>
              <p style={{ marginTop: "12px", marginBottom: 0, color: "#6b7280" }}>
                {maintenanceEditId != null
                  ? maintenanceEditStatus === "Erledigt"
                    ? "Du kannst die Wartungsdaten und die tatsächlichen Kosten nachträglich ändern."
                    : "Du kannst die offene Wartung nachträglich ändern. Zum Abschließen wird separat nach den tatsächlichen Kosten gefragt."
                  : "Die Wartung wird zunächst als offen gespeichert. Nach Durchführung kannst du sie in der Wartungshistorie als erledigt markieren."}
              </p>
              {maintenanceMessage && <p className={maintenanceMessage.startsWith("✓") ? "success" : "warning"} style={{ marginTop: "16px" }}>{maintenanceMessage}</p>}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px", flexWrap: "wrap" }}>
                <button type="button" className="secondary-button" onClick={closeMaintenance} disabled={maintenanceSaving}>Abbrechen</button>
                <button type="button" className="primary-button" onClick={saveMaintenance} disabled={maintenanceSaving}>{maintenanceSaving ? "Wird gespeichert..." : maintenanceEditId != null ? "Änderungen speichern" : "Wartung speichern"}</button>
              </div>
            </div>
          </div>
        )}

        {fleetEditVehicle && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 1000,
            }}
          >
            <div
              className="card"
              style={{
                width: "100%",
                maxWidth: "520px",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <h2 style={{ marginBottom: "4px" }}>Fahrzeug bearbeiten</h2>
                  <p style={{ marginBottom: 0 }}>
                    {fleetEditVehicle.kennzeichen} · {fleetEditVehicle.hersteller_modell || fleetEditVehicle.fahrzeugtyp || "Fahrzeug"}
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeFleetEdit}
                  disabled={fleetEditSaving}
                >
                  Schließen
                </button>
              </div>

              <div style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
                <div>
                  <label htmlFor="fleet-kilometers">Kilometerstand</label>
                  <input
                    id="fleet-kilometers"
                    type="text"
                    inputMode="numeric"
                    value={fleetEditKilometers}
                    onChange={(event) => setFleetEditKilometers(event.target.value)}
                    placeholder="z. B. 82500"
                  />
                </div>

                <div>
                  <label htmlFor="fleet-status">Fahrzeugstatus</label>
                  <select
                    id="fleet-status"
                    value={fleetEditStatus}
                    onChange={(event) => setFleetEditStatus(event.target.value)}
                  >
                    <option value="Aktiv">Aktiv</option>
                    <option value="Werkstatt">Werkstatt</option>
                    <option value="Außer Betrieb">Außer Betrieb</option>
                  </select>
                </div>
              </div>

              {fleetEditMessage && (
                <p
                  className={fleetEditMessage.startsWith("✓") ? "success" : "warning"}
                  style={{ marginTop: "16px" }}
                >
                  {fleetEditMessage}
                </p>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeFleetEdit}
                  disabled={fleetEditSaving}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={saveFleetEdit}
                  disabled={fleetEditSaving}
                >
                  {fleetEditSaving ? "Wird gespeichert..." : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        )}

        {page === "users" && isAdmin && (
          <section>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <h2>Benutzer & Berechtigungen</h2>
                  <p>Benutzerkonten verwalten und Rollen zuweisen.</p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadAppUsers}
                  disabled={usersLoading}
                >
                  {usersLoading ? "Aktualisiere..." : "↻ Aktualisieren"}
                </button>
              </div>

              {usersError && (
                <p className="warning">{usersError}</p>
              )}

              {usersLoading && <p>Benutzer werden geladen...</p>}

              {!usersLoading && appUsers.length === 0 && (
                <p>Noch keine Benutzerprofile gefunden.</p>
              )}

              {!usersLoading && appUsers.map((user) => (
                <div
                  key={user.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "16px",
                    marginTop: "12px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{user.name || "Ohne Namen"}</strong>
                    <div>{user.email}</div>
                  </div>

                  <div>
                    <label>Rolle</label>
                    <select
                      value={user.rolle}
                      disabled={user.id === currentUser?.id}
                      onChange={(event) =>
                        changeUserRole(
                          user.id,
                          event.target.value as UserRole
                        )
                      }
                    >
                      <option value="Admin">Admin</option>
                      <option value="Disponent">Disponent</option>
                      <option value="Fahrer">Fahrer</option>
                    </select>
                  </div>

                  <div>
                    <strong>Freigabe:</strong>{" "}
                    {user.freigabestatus === "Freigegeben"
                      ? "✅ Freigegeben"
                      : user.freigabestatus === "Gesperrt"
                        ? "🚫 Gesperrt"
                        : "⏳ Ausstehend"}
                    <div style={{ marginTop: "6px", fontSize: "14px" }}>
                      Konto: {user.aktiv ? "Aktiv" : "Deaktiviert"}
                    </div>
                  </div>

                  {user.id !== currentUser?.id && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {user.freigabestatus !== "Freigegeben" && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => changeUserApproval(user.id, "Freigegeben")}
                        >
                          ✅ Freigeben
                        </button>
                      )}
                      {user.freigabestatus !== "Gesperrt" && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => changeUserApproval(user.id, "Gesperrt")}
                        >
                          🚫 Sperren
                        </button>
                      )}
                      {user.freigabestatus === "Gesperrt" && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => changeUserApproval(user.id, "Ausstehend")}
                        >
                          ⏳ Auf ausstehend
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e5e7eb", paddingTop: "14px" }}>
                    <strong>Berechtigungen</strong>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px", marginTop: "10px" }}>
                      {permissionOptions.map((permission) => {
                        const checked = (permissionDrafts[user.id] || []).includes(permission.key)
                        return (
                          <label key={permission.key} style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(user.id, permission.key)}
                            />
                            {permission.label}
                          </label>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ marginTop: "12px" }}
                      onClick={() => saveUserPermissions(user.id)}
                      disabled={permissionSavingId === user.id}
                    >
                      {permissionSavingId === user.id ? "Wird gespeichert..." : "Berechtigungen speichern"}
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: "24px", borderTop: "2px solid #e5e7eb", paddingTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ marginBottom: "4px" }}>📚 SOP-Übersicht</h3>
                    <p style={{ margin: 0 }}>
                      Hier siehst du, welche Fahrer welche SOP-Versionen bestätigt haben und was noch offen ist.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={loadAdminSopOverview}
                    disabled={adminSopLoading}
                  >
                    {adminSopLoading ? "Wird geladen..." : "↻ SOP-Status aktualisieren"}
                  </button>
                </div>

                {adminSopError && <p className="warning" style={{ marginTop: "12px" }}>{adminSopError}</p>}

                {!adminSopLoading && (
                  <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
                    {appUsers
                      .filter((user) => user.rolle === "Fahrer")
                      .map((driver) => {
                        const activeSops = sops.filter((sop) => sop.aktiv)
                        const confirmed = activeSops.filter((sop) =>
                          adminSopConfirmations.some(
                            (item) =>
                              item.fahrer_id === driver.id &&
                              item.sop_id === sop.id &&
                              item.version === sop.version
                          )
                        )
                        const open = activeSops.filter((sop) =>
                          !adminSopConfirmations.some(
                            (item) =>
                              item.fahrer_id === driver.id &&
                              item.sop_id === sop.id &&
                              item.version === sop.version
                          )
                        )

                        return (
                          <div key={driver.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                              <div>
                                <strong>{driver.name || "Ohne Namen"}</strong>
                                <div style={{ fontSize: "14px", opacity: 0.75 }}>{driver.email}</div>
                              </div>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                <span>✅ {confirmed.length} bestätigt</span>
                                <span>⏳ {open.length} offen</span>
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={() => downloadSopConfirmationPdf(driver)}
                                  disabled={adminSopPdfLoadingId === driver.id}
                                >
                                  {adminSopPdfLoadingId === driver.id ? "PDF wird erstellt..." : "📄 SOP-PDF"}
                                </button>
                              </div>
                            </div>

                            {open.length > 0 && (
                              <div style={{ marginTop: "10px", padding: "10px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.10)" }}>
                                <strong>Offene SOPs:</strong>
                                <ul style={{ margin: "6px 0 0 20px" }}>
                                  {open.map((sop) => (
                                    <li key={sop.id}>{sop.titel} – Version {sop.version}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {confirmed.length > 0 && (
                              <div style={{ marginTop: "10px" }}>
                                <strong>Bestätigt:</strong>
                                <ul style={{ margin: "6px 0 0 20px" }}>
                                  {confirmed.map((sop) => {
                                    const confirmation = adminSopConfirmations.find(
                                      (item) =>
                                        item.fahrer_id === driver.id &&
                                        item.sop_id === sop.id &&
                                        item.version === sop.version
                                    )
                                    return (
                                      <li key={sop.id}>
                                        {sop.titel} – Version {sop.version}
                                        {" · "}
                                        {confirmation?.bestaetigt_am
                                          ? new Date(confirmation.bestaetigt_am).toLocaleString("de-DE")
                                          : "Datum unbekannt"}
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              <p style={{ marginTop: "18px", fontSize: "14px" }}>
                Hinweis: Der eigene Admin-Account kann in dieser Ansicht nicht versehentlich auf eine andere Rolle gesetzt werden.
              </p>
            </div>
          </section>
        )}

        {page === "sops" && (
          <section>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <h2>📚 SOP & Schulungen</h2>
                  <p style={{ marginBottom: 0 }}>
                    Aktive Arbeitsanweisungen und Schulungen. Bestätigungen werden pro SOP-Version gespeichert.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button type="button" className="secondary-button" onClick={loadSops} disabled={sopLoading}>
                    {sopLoading ? "Wird geladen..." : "↻ Aktualisieren"}
                  </button>
                  {canManageSops && (
                    <button type="button" className="primary-button" onClick={openSopCreate}>
                      ＋ SOP anlegen
                    </button>
                  )}
                </div>
              </div>
            </div>

            {sopError && <div className="card"><p className="warning">{sopError}</p></div>}

            {canManageSops && sopFormOpen && (
              <div className="card">
                <h3>{sopEditingId ? "SOP bearbeiten" : "Neue SOP"}</h3>
                <div style={{ display: "grid", gap: "12px" }}>
                  <div>
                    <label htmlFor="sop-title">Titel</label>
                    <input id="sop-title" value={sopTitle} onChange={(e) => setSopTitle(e.target.value)} placeholder="z. B. Fahrzeugübernahme" />
                  </div>
                  <div>
                    <label htmlFor="sop-description">Kurzbeschreibung</label>
                    <input id="sop-description" value={sopDescription} onChange={(e) => setSopDescription(e.target.value)} placeholder="Worum geht es bei dieser SOP?" />
                  </div>
                  <div>
                    <label htmlFor="sop-version">Version</label>
                    <input id="sop-version" value={sopVersion} onChange={(e) => setSopVersion(e.target.value)} placeholder="1.0" />
                  </div>
                  <div>
                    <label htmlFor="sop-content">Inhalt</label>
                    <textarea id="sop-content" value={sopContent} onChange={(e) => setSopContent(e.target.value)} rows={12} placeholder="Arbeitsanweisung..." />
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button type="button" className="secondary-button" onClick={resetSopForm} disabled={sopSaving}>Abbrechen</button>
                    <button type="button" className="primary-button" onClick={saveSop} disabled={sopSaving}>
                      {sopSaving ? "Wird gespeichert..." : "SOP speichern"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {sopLoading && <div className="card"><p>SOPs werden geladen...</p></div>}

            {!sopLoading && sops.length === 0 && (
              <div className="card"><p>Keine aktiven SOPs vorhanden.</p></div>
            )}

            {!sopLoading && sops.map((sop) => {
              const confirmed = hasConfirmedSop(sop)
              return (
                <div className="card" key={sop.id} style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ marginBottom: "4px" }}>{sop.titel}</h3>
                      <div style={{ fontSize: "14px", opacity: 0.75 }}>Version {sop.version}</div>
                      {sop.beschreibung && <p>{sop.beschreibung}</p>}
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {confirmed ? "✅ Bestätigt" : "⏳ Noch nicht bestätigt"}
                    </div>
                  </div>

                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: "14px", padding: "14px", borderRadius: "10px", background: "rgba(0,0,0,0.035)" }}>
                    {sop.inhalt}
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                    {!confirmed && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => confirmSop(sop)}
                        disabled={sopConfirmingId === sop.id}
                      >
                        {sopConfirmingId === sop.id ? "Wird bestätigt..." : "✓ SOP gelesen & verstanden"}
                      </button>
                    )}
                    {canManageSops && (
                      <>
                        <button type="button" className="secondary-button" onClick={() => openSopEdit(sop)}>Bearbeiten</button>
                        <button type="button" className="secondary-button" onClick={() => deactivateSop(sop.id)}>Deaktivieren</button>
                      </>
                    )}
                  </div>

                  {confirmed && (
                    <p className="success" style={{ marginTop: "12px", marginBottom: 0 }}>
                      Diese Version wurde von dir am {sopConfirmations.find((item) => item.sop_id === sop.id && item.version === sop.version)?.bestaetigt_am
                        ? new Date(sopConfirmations.find((item) => item.sop_id === sop.id && item.version === sop.version)!.bestaetigt_am!).toLocaleString("de-DE")
                        : "bereits bestätigt"} bestätigt.
                    </p>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {page === "defect" && (
          <section>

            <div className="card">

              <h2>
                Fahrzeugmangel melden
              </h2>

              <p>
                Bitte Mängel möglichst
                genau dokumentieren.
              </p>

              {/* MANGEL-ÜBERSICHT */}

              {defectCounts.gesamt > 0 && (
                <div className="defect-overview">

                  <h3>
                    Offene Mängel
                  </h3>

                  <div className="defect-overview-badges">

                    {defectCounts.dringend >
                      0 && (
                      <button
                        type="button"
                        className="defect-overview-item urgent"
                        onClick={() =>
                          openDefectDetails("Dringend")
                        }
                        style={{
                          cursor: "pointer",
                          border: "none",
                          font: "inherit",
                          textAlign: "center",
                        }}
                        title="Dringende Mängel anzeigen"
                      >
                        <strong>
                          {
                            defectCounts.dringend
                          }
                        </strong>
                        <span>
                          Dringend
                        </span>
                      </button>
                    )}

                    {defectCounts.wichtig >
                      0 && (
                      <button
                        type="button"
                        className="defect-overview-item important"
                        onClick={() =>
                          openDefectDetails("Wichtig")
                        }
                        style={{
                          cursor: "pointer",
                          border: "none",
                          font: "inherit",
                          textAlign: "center",
                        }}
                        title="Wichtige Mängel anzeigen"
                      >
                        <strong>
                          {
                            defectCounts.wichtig
                          }
                        </strong>
                        <span>
                          Wichtig
                        </span>
                      </button>
                    )}

                    {defectCounts.normal >
                      0 && (
                      <button
                        type="button"
                        className="defect-overview-item normal"
                        onClick={() =>
                          openDefectDetails("Normal")
                        }
                        style={{
                          cursor: "pointer",
                          border: "none",
                          font: "inherit",
                          textAlign: "center",
                        }}
                        title="Normale Mängel anzeigen"
                      >
                        <strong>
                          {
                            defectCounts.normal
                          }
                        </strong>
                        <span>
                          Normal
                        </span>
                      </button>
                    )}

                  </div>

                </div>
              )}

              <div className="form-group">

                <label>
                  Kategorie
                </label>

                <select
                  value={defect.category}
                  onChange={(event) =>
                    setDefect({
                      ...defect,
                      category:
                        event.target.value,
                    })
                  }
                >

                  <option value="">
                    Bitte auswählen
                  </option>

                  <option value="Reifen">
                    Reifen
                  </option>

                  <option value="Beleuchtung">
                    Beleuchtung
                  </option>

                  <option value="Scheiben und Spiegel">
                    Scheiben und Spiegel
                  </option>

                  <option value="Bremsen">
                    Bremsen
                  </option>

                  <option value="Laderaum">
                    Laderaum
                  </option>

                  <option value="Fahrzeugschaden">
                    Fahrzeugschaden
                  </option>

                  <option value="Sonstiges">
                    Sonstiges
                  </option>

                </select>

              </div>

              <div className="form-group">

                <label>
                  Beschreibung
                </label>

                <textarea
                  value={
                    defect.description
                  }
                  onChange={(event) =>
                    setDefect({
                      ...defect,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="Was wurde festgestellt?"
                />

              </div>

              <div className="form-group">

                <label>
                  Priorität
                </label>

                <select
                  value={
                    defect.priority
                  }
                  onChange={(event) =>
                    setDefect({
                      ...defect,
                      priority:
                        event.target.value,
                    })
                  }
                >

                  <option value="Normal">
                    🟢 Normal
                  </option>

                  <option value="Wichtig">
                    🟠 Wichtig
                  </option>

                  <option value="Dringend">
                    🔴 Dringend
                  </option>

                </select>

              </div>

              <div className="form-group">

                <label>
                  Foto hinzufügen
                </label>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                />

              </div>

              {defect.photo && (
                <div className="photo-preview">

                  <p>
                    Foto ausgewählt:
                  </p>

                  <img
                    src={defect.photo}
                    alt="Mangel"
                  />

                </div>
              )}

              <button
                className="primary-button"
                disabled={defectSaving}
                onClick={submitDefect}
              >
                {defectSaving
                  ? "Mangel wird gespeichert..."
                  : "Mangel melden"}
              </button>

              {defectSubmitted && (
                <p className="success">
                  ✓ Mangel wurde erfolgreich in
                  Supabase gespeichert.
                </p>
              )}

            </div>

          </section>
        )}

      </main>

    </div>
  )
}

export default App
