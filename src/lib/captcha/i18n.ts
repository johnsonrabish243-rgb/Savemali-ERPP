import type { Language } from "./types"

export type CaptchaKey =
  | "badge.label"
  | "badge.privacy"
  | "badge.terms"
  | "badge.security"
  | "challenge.shape.title"
  | "challenge.shape.instruction"
  | "challenge.image.title"
  | "challenge.image.instruction"
  | "challenge.people.title"
  | "challenge.people.instruction"
  | "challenge.puzzle.title"
  | "challenge.puzzle.instruction"
  | "challenge.sequential.title"
  | "challenge.sequential.instruction"
  | "challenge.audio.title"
  | "challenge.audio.instruction"
  | "verify"
  | "reload"
  | "skip"
  | "verifying"
  | "verified"
  | "error.incorrect"
  | "error.locked"
  | "error.timeout"
  | "error.generic"
  | "attempts.remaining"
  | "lockout.message"
  | "lockout.seconds"
  | "score.low"
  | "score.medium"
  | "score.high"
  | "accessibility.alt"

const translations: Record<Language, Record<CaptchaKey, string>> = {
  fr: {
    "badge.label": "Je ne suis pas un robot",
    "badge.privacy": "Confidentialité",
    "badge.terms": "Conditions",
    "badge.security": "SÉCURITÉ",
    "challenge.shape.title": "Vérification par formes",
    "challenge.shape.instruction": "Sélectionnez toutes les images correspondant à la forme et couleur demandées",
    "challenge.image.title": "Vérification par images",
    "challenge.image.instruction": "Sélectionnez toutes les images contenant",
    "challenge.people.title": "Vérification par personnes",
    "challenge.people.instruction": "Sélectionnez toutes les images montrant",
    "challenge.puzzle.title": "Vérification par puzzle",
    "challenge.puzzle.instruction": "Résolvez le puzzle pour continuer",
    "challenge.sequential.title": "Vérification séquentielle",
    "challenge.sequential.instruction": "Cliquez dans l'ordre spécifié",
    "challenge.audio.title": "Vérification audio",
    "challenge.audio.instruction": "Saisissez le code que vous entendez",
    "verify": "VÉRIFIER",
    "reload": "Nouvelle image",
    "skip": "Passer",
    "verifying": "Vérification en cours...",
    "verified": "Vérifié avec succès",
    "error.incorrect": "Sélection incorrecte",
    "error.locked": "Trop de tentatives. Compte verrouillé.",
    "error.timeout": "Temps écoulé. Nouveau défi...",
    "error.generic": "Une erreur est survenue",
    "attempts.remaining": "essai(s) restant(s)",
    "lockout.message": "Trop de tentatives. Réessayez dans",
    "lockout.seconds": "s",
    "score.low": "Risque faible",
    "score.medium": "Risque moyen",
    "score.high": "Risque élevé",
    "accessibility.alt": "Défi de vérification",
  },
  en: {
    "badge.label": "I'm not a robot",
    "badge.privacy": "Privacy",
    "badge.terms": "Terms",
    "badge.security": "SECURITY",
    "challenge.shape.title": "Shape verification",
    "challenge.shape.instruction": "Select all images matching the requested shape and color",
    "challenge.image.title": "Image verification",
    "challenge.image.instruction": "Select all images containing",
    "challenge.people.title": "People verification",
    "challenge.people.instruction": "Select all images showing",
    "challenge.puzzle.title": "Puzzle verification",
    "challenge.puzzle.instruction": "Solve the puzzle to continue",
    "challenge.sequential.title": "Sequential verification",
    "challenge.sequential.instruction": "Click in the specified order",
    "challenge.audio.title": "Audio verification",
    "challenge.audio.instruction": "Type the code you hear",
    "verify": "VERIFY",
    "reload": "Reload",
    "skip": "Skip",
    "verifying": "Verifying...",
    "verified": "Verified successfully",
    "error.incorrect": "Incorrect selection",
    "error.locked": "Too many attempts. Account locked.",
    "error.timeout": "Time expired. New challenge...",
    "error.generic": "An error occurred",
    "attempts.remaining": "attempt(s) remaining",
    "lockout.message": "Too many attempts. Retry in",
    "lockout.seconds": "s",
    "score.low": "Low risk",
    "score.medium": "Medium risk",
    "score.high": "High risk",
    "accessibility.alt": "Verification challenge",
  },
  es: {
    "badge.label": "No soy un robot",
    "badge.privacy": "Privacidad",
    "badge.terms": "Términos",
    "badge.security": "SEGURIDAD",
    "challenge.shape.title": "Verificación de formas",
    "challenge.shape.instruction": "Seleccione todas las imágenes que coincidan",
    "challenge.image.title": "Verificación de imágenes",
    "challenge.image.instruction": "Seleccione todas las imágenes que contengan",
    "challenge.people.title": "Verificación de personas",
    "challenge.people.instruction": "Seleccione todas las imágenes que muestren",
    "challenge.puzzle.title": "Verificación de puzzle",
    "challenge.puzzle.instruction": "Resuelve el puzzle para continuar",
    "challenge.sequential.title": "Verificación secuencial",
    "challenge.sequential.instruction": "Haga clic en el orden especificado",
    "challenge.audio.title": "Verificación de audio",
    "challenge.audio.instruction": "Escriba el código que escucha",
    "verify": "VERIFICAR",
    "reload": "Recargar",
    "skip": "Saltar",
    "verifying": "Verificando...",
    "verified": "Verificado exitosamente",
    "error.incorrect": "Selección incorrecta",
    "error.locked": "Demasiados intentos. Cuenta bloqueada.",
    "error.timeout": "Tiempo agotado. Nuevo desafío...",
    "error.generic": "Ocurrió un error",
    "attempts.remaining": "intento(s) restante(s)",
    "lockout.message": "Demasiados intentos. Reintente en",
    "lockout.seconds": "s",
    "score.low": "Riesgo bajo",
    "score.medium": "Riesgo medio",
    "score.high": "Riesgo alto",
    "accessibility.alt": "Desafío de verificación",
  },
  pt: {
    "badge.label": "Não sou um robô",
    "badge.privacy": "Privacidade",
    "badge.terms": "Termos",
    "badge.security": "SEGURANÇA",
    "challenge.shape.title": "Verificação de formas",
    "challenge.shape.instruction": "Selecione todas as imagens correspondentes",
    "challenge.image.title": "Verificação de imagens",
    "challenge.image.instruction": "Selecione todas as imagens contendo",
    "challenge.people.title": "Verificação de pessoas",
    "challenge.people.instruction": "Selecione todas as imagens mostrando",
    "challenge.puzzle.title": "Verificação de puzzle",
    "challenge.puzzle.instruction": "Resolva o puzzle para continuar",
    "challenge.sequential.title": "Verificação sequencial",
    "challenge.sequential.instruction": "Clique na ordem especificada",
    "challenge.audio.title": "Verificação de áudio",
    "challenge.audio.instruction": "Digite o código que você ouve",
    "verify": "VERIFICAR",
    "reload": "Recarregar",
    "skip": "Pular",
    "verifying": "Verificando...",
    "verified": "Verificado com sucesso",
    "error.incorrect": "Seleção incorreta",
    "error.locked": "Muitas tentativas. Conta bloqueada.",
    "error.timeout": "Tempo esgotado. Novo desafio...",
    "error.generic": "Ocorreu um erro",
    "attempts.remaining": "tentativa(s) restante(s)",
    "lockout.message": "Muitas tentativas. Tente novamente em",
    "lockout.seconds": "s",
    "score.low": "Risco baixo",
    "score.medium": "Risco médio",
    "score.high": "Risco alto",
    "accessibility.alt": "Desafio de verificação",
  },
  ar: {
    "badge.label": "أنا لست روبوتًا",
    "badge.privacy": "الخصوصية",
    "badge.terms": "الشروط",
    "badge.security": "الأمان",
    "challenge.shape.title": "التحقق من الأشكال",
    "challenge.shape.instruction": "حدد جميع الصور المطابقة",
    "challenge.image.title": "التحقق من الصور",
    "challenge.image.instruction": "حدد جميع الصور التي تحتوي على",
    "challenge.people.title": "التحقق من الأشخاص",
    "challenge.people.instruction": "حدد جميع الصور التي تظهر",
    "challenge.puzzle.title": "التحقق من اللغز",
    "challenge.puzzle.instruction": "حل اللغز للمتابعة",
    "challenge.sequential.title": "التحقق التسلسلي",
    "challenge.sequential.instruction": "انقر بالترتيب المحدد",
    "challenge.audio.title": "التحقق الصوتي",
    "challenge.audio.instruction": "اكتب الرمز الذي تسمعه",
    "verify": "تحقق",
    "reload": "إعادة تحميل",
    "skip": "تخطي",
    "verifying": "جاري التحقق...",
    "verified": "تم التحقق بنجاح",
    "error.incorrect": "اختيار غير صحيح",
    "error.locked": "محاولات كثيرة جدًا. الحساب مقفل.",
    "error.timeout": "انتهى الوقت. تحدٍ جديد...",
    "error.generic": "حدث خطأ",
    "attempts.remaining": "محاولة (محاولات) متبقية",
    "lockout.message": "محاولات كثيرة جدًا. أعد المحاولة بعد",
    "lockout.seconds": "ث",
    "score.low": "مخاطر منخفضة",
    "score.medium": "مخاطر متوسطة",
    "score.high": "مخاطر عالية",
    "accessibility.alt": "تحدي التحقق",
  },
  sw: {
    "badge.label": "Mimi sio roboti",
    "badge.privacy": "Faragha",
    "badge.terms": "Sheria",
    "badge.security": "USALAMA",
    "challenge.shape.title": "Uthibitishaji wa maumbo",
    "challenge.shape.instruction": "Chagua picha zote zinazolingana",
    "challenge.image.title": "Uthibitishaji wa picha",
    "challenge.image.instruction": "Chagua picha zote zenye",
    "challenge.people.title": "Uthibitishaji wa watu",
    "challenge.people.instruction": "Chagua picha zote zinazoonyesha",
    "challenge.puzzle.title": "Uthibitishaji wa puzzle",
    "challenge.puzzle.instruction": "Tatua puzzle kuendelea",
    "challenge.sequential.title": "Uthibitishaji wa mfuatano",
    "challenge.sequential.instruction": "Bofya kwa mpangilio uliobainishwa",
    "challenge.audio.title": "Uthibitishaji wa sauti",
    "challenge.audio.instruction": "Andika msimbo unaosikia",
    "verify": "THIBITISHA",
    "reload": "Pakia upya",
    "skip": "Ruka",
    "verifying": "Inathibitisha...",
    "verified": "Imethibitishwa kwa mafanikio",
    "error.incorrect": "Uchaguzi si sahihi",
    "error.locked": "Majaribio mengi. Akaunti imefungwa.",
    "error.timeout": "Muda umeisha. Changamoto mpya...",
    "error.generic": "Hitilafu imetokea",
    "attempts.remaining": "jaribio lililobaki",
    "lockout.message": "Majaribio mengi. Jaribu tena baada ya",
    "lockout.seconds": "s",
    "score.low": "Hatari ndogo",
    "score.medium": "Hatari wastani",
    "score.high": "Hatari kubwa",
    "accessibility.alt": "Changamoto ya uthibitishaji",
  },
}

export function captchaT(lang: Language, key: CaptchaKey): string {
  return translations[lang]?.[key] ?? translations["fr"][key]
}

export function useCaptchaLang(lang: Language): (key: CaptchaKey) => string {
  return (key: CaptchaKey) => captchaT(lang, key)
}
