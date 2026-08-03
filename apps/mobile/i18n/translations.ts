import { Language, translations as rootTranslations } from "../../../src/i18n/translations";

export type { Language };

const mobileTranslations = {
  no: {
    // Auth
    'auth.fillAllFields': 'Vennligst fyll ut alle felt',
    'auth.errorSignIn': 'Kunne ikke logge inn. Vennligst sjekk e-post og passord.',
    'auth.partnerActiveLifestyle': 'Din partner for en aktiv livsstil',
    'auth.loginJourney': 'Logg inn for å fortsette reisen',
    'auth.email': 'E-post',
    'auth.emailPlaceholder': 'navn@eksempel.no',
    'auth.password': 'Passord',
    'auth.passwordPlaceholder': 'Skriv inn passord',
    'auth.forgotPassword': 'Glemt passord?',
    'auth.noAccount': 'Har du ingen konto?',
    'auth.signup': 'Registrer deg',
    'auth.passwordsDontMatch': 'Passordene er ikke like',
    'auth.passwordTooShort': 'Passordet må være minst 6 tegn',
    'auth.success': 'Suksess',
    'auth.confirmationSent': 'En bekreftelses-e-post er sendt. Vennligst sjekk innboksen din.',
    'auth.errorSignUp': 'Kunne ikke opprette konto. Prøv igjen.',
    'auth.createAccount': 'Opprett konto',
    'auth.joinJourney': 'Bli med på reisen mot en sprekere hverdag',
    'auth.choosePassword': 'Velg et sterkt passord',
    'auth.confirmPassword': 'Bekreft passord',
    'auth.repeatPassword': 'Gjenta passord',
    'auth.hasAccount': 'Har du allerede en konto?',
    'auth.provideEmail': 'Vennligst oppgi en e-postadresse',
    'auth.emailSent': 'E-post sendt',
    'auth.resetLinkSent': 'En lenke for tilbakestilling er sendt til din e-post.',
    'auth.errorSendRequest': 'Kunne ikke sende forespørsel',
    'auth.regainAccess': 'Gjenopprett tilgang til kontoen din',
    'auth.enterEmailReset': 'Skriv inn e-posten din så sender vi en lenke for å velge nytt passord.',
    'auth.sendLink': 'Send lenke',
    'auth.rememberPassword': 'Husker du passordet?',
    'auth.newPassword': 'Nytt passord',
    'auth.enterNewPassword': 'Velg et nytt og sikkert passord for din konto',
    'auth.chooseNewPassword': 'Velg nytt passord',
    'auth.repeatNewPassword': 'Gjenta nytt passord',
    'auth.updatePassword': 'Oppdater passord',
    'auth.passwordUpdated': 'Passordet ditt er nå oppdatert.',
    'auth.errorUpdatePassword': 'Kunne ikke oppdatere passord',

    // Calendar
    'calendar.errorLoading': 'Kunne ikke laste kalenderdata',
    'calendar.weekdays.mon': 'Man',
    'calendar.weekdays.tue': 'Tir',
    'calendar.weekdays.wed': 'Ons',
    'calendar.weekdays.thu': 'Tor',
    'calendar.weekdays.fri': 'Fre',
    'calendar.weekdays.sat': 'Lør',
    'calendar.weekdays.sun': 'Søn',

    // Weather
    'weather.unavailable': 'Værdata er ikke tilgjengelig for øyeblikket',

    // Workout Detail
    'workoutDetail.delete': 'Slett økt',
    'workoutDetail.confirmDeleteDesc': 'Er du sikker på at du vil slette "{name}"? Denne handlingen kan ikke angres.',
    'workoutDetail.deleteError': 'Kunne ikke slette økten.',
    'workoutDetail.avgMax': 'Gjennomsnitt / Maks',
    'workoutDetail.calories': 'Kalorier',
    'workoutDetail.mapUnavailableWeb': 'Kartet er kun tilgjengelig i appen',

    // Common
    'common.error': 'Feil',
    'common.loading': 'Laster...',
    'common.points': 'poeng',
    'common.more': 'Mer',
    'common.moh': 'm.o.h',
    'common.appName': 'Treningsappen',
    'common.tomorrow': 'I morgen',
    'common.connect': 'Koble til',
    'common.average': 'Snitt',
    'common.max': 'Maks',
    'common.search': 'Søk',

    // Map
    'map.distanceUnknown': 'Ukjent avstand',
    'map.yourDistance': 'Din avstand',
    'map.createRoute': 'Lag rute',
    'map.howToStart': 'Velg startpunkt på kartet for å lage en rute.',
    'map.fromMyPosition': 'Fra min posisjon',
    'map.createRouteError': 'Kunne ikke lage rute. Prøv igjen.',
    'map.noDescription': 'Ingen beskrivelse tilgjengelig',
    'map.selectStartPoint': 'Velg startpunkt',
    'map.tab.feed': 'Feed',
    'map.tab.leaderboard': 'Lederliste',

    // Peak
    'peak.routeCreateError': 'Kunne ikke opprette rute for denne toppen',
    'peak.waypointAddError': 'Kunne ikke legge til veipunkt',
    'peak.waypointUpdateError': 'Kunne ikke oppdatere veipunkt',

    // Community
    'community.newChallengeMobile': 'Ny utfordring',
    'community.mineMobile': 'Mine',
    'community.activeMobile': 'Aktive',

    // Settings
    'settings.mer': 'Mer',
    'settings.version': 'Versjon',
    'settings.build': 'Bygg',
    'settings.administrator': 'Administrator',
    'settings.adminMode': 'Admin-modus',
    'settings.signOutConfirm': 'Er du sikker på at du vil logge ut?',
    'settings.healthKitDesc': 'Henter automatisk treningsdata, skritt og puls fra HealthKit.',
    'settings.googleFitDesc': 'Henter automatisk treningsdata, skritt og puls fra Google Fit.',
    'settings.notifTitle': 'Varslinger',

    // Global Leaderboard
    'globalLeaderboard.peak': 'Topp',
    'globalLeaderboard.trip': 'Tur',
    'globalLeaderboard.peaks': 'topper',
    'globalLeaderboard.trips': 'turer',
    'globalLeaderboard.global': 'Global',
    'globalLeaderboard.friends': 'Venner',
    'globalLeaderboard.uniquePeaks': 'Unike topper',
    'globalLeaderboard.totalTrips': 'Totalt antall turer',
    'globalLeaderboard.month': 'Måned',
    'globalLeaderboard.year': 'År',
    'globalLeaderboard.total': 'Totalt',
    'globalLeaderboard.noFriendCheckins': 'Ingen av vennene dine har sjekket inn på topper ennå.',
    'globalLeaderboard.noCheckins': 'Ingen innsjekkinger funnet ennå.',

    // Records
    'records.running5km': 'Løping 5 km',
    'records.running10km': 'Løping 10 km',
    'records.runningHalfMarathon': 'Halvmaraton',
    'records.cycling10km': 'Sykling 10 km',
    'records.cycling20km': 'Sykling 20 km',
    'records.cycling50km': 'Sykling 50 km',

    // Peaks List
    'peaksList.awayM': '{n} m unna',
    'peaksList.awayKm': '{n} km unna',
    'peaksList.reached': 'Nådd',
    'peaksList.notReached': 'Ikke nådd',
    'peaksList.peaks': 'topper',
    'peaksList.searchPlaceholder': 'Søk etter topper...',
    'peaksList.noPeaksFound': 'Ingen topper funnet',
    'peaksList.noPeaksFoundFor': 'Ingen topper funnet for "{query}"',
    'peaksList.changeFilter': 'Prøv å endre søket eller filtrene dine.',
    
    // Welcome
    'welcome.title': 'Velkommen',
  },
  en: {
    // Auth
    'auth.fillAllFields': 'Please fill in all fields',
    'auth.errorSignIn': 'Could not sign in. Please check your email and password.',
    'auth.partnerActiveLifestyle': 'Your partner for an active lifestyle',
    'auth.loginJourney': 'Log in to continue your journey',
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'name@example.com',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Enter password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.noAccount': "Don't have an account?",
    'auth.signup': 'Sign up',
    'auth.passwordsDontMatch': "Passwords don't match",
    'auth.passwordTooShort': 'Password must be at least 6 characters',
    'auth.success': 'Success',
    'auth.confirmationSent': 'A confirmation email has been sent. Please check your inbox.',
    'auth.errorSignUp': 'Could not create account. Please try again.',
    'auth.createAccount': 'Create account',
    'auth.joinJourney': 'Join the journey towards a fitter everyday life',
    'auth.choosePassword': 'Choose a strong password',
    'auth.confirmPassword': 'Confirm password',
    'auth.repeatPassword': 'Repeat password',
    'auth.hasAccount': 'Already have an account?',
    'auth.provideEmail': 'Please provide an email address',
    'auth.emailSent': 'Email sent',
    'auth.resetLinkSent': 'A reset link has been sent to your email.',
    'auth.errorSendRequest': 'Could not send request',
    'auth.regainAccess': 'Regain access to your account',
    'auth.enterEmailReset': 'Enter your email and we will send a link to choose a new password.',
    'auth.sendLink': 'Send link',
    'auth.rememberPassword': 'Remember your password?',
    'auth.newPassword': 'New password',
    'auth.enterNewPassword': 'Choose a new and secure password for your account',
    'auth.chooseNewPassword': 'Choose new password',
    'auth.repeatNewPassword': 'Repeat new password',
    'auth.updatePassword': 'Update password',
    'auth.passwordUpdated': 'Your password has been updated.',
    'auth.errorUpdatePassword': 'Could not update password',

    // Calendar
    'calendar.errorLoading': 'Could not load calendar data',
    'calendar.weekdays.mon': 'Mon',
    'calendar.weekdays.tue': 'Tue',
    'calendar.weekdays.wed': 'Wed',
    'calendar.weekdays.thu': 'Thu',
    'calendar.weekdays.fri': 'Fri',
    'calendar.weekdays.sat': 'Sat',
    'calendar.weekdays.sun': 'Sun',

    // Weather
    'weather.unavailable': 'Weather data is currently unavailable',

    // Workout Detail
    'workoutDetail.delete': 'Delete session',
    'workoutDetail.confirmDeleteDesc': 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    'workoutDetail.deleteError': 'Could not delete session.',
    'workoutDetail.avgMax': 'Average / Max',
    'workoutDetail.calories': 'Calories',
    'workoutDetail.mapUnavailableWeb': 'The map is only available in the app',

    // Common
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.points': 'points',
    'common.more': 'More',
    'common.moh': 'm.a.s.l',
    'common.appName': 'The Training App',
    'common.tomorrow': 'Tomorrow',
    'common.connect': 'Connect',
    'common.average': 'Avg',
    'common.max': 'Max',
    'common.search': 'Search',

    // Map
    'map.distanceUnknown': 'Unknown distance',
    'map.yourDistance': 'Your distance',
    'map.createRoute': 'Create route',
    'map.howToStart': 'Select a starting point on the map to create a route.',
    'map.fromMyPosition': 'From my position',
    'map.createRouteError': 'Could not create route. Please try again.',
    'map.noDescription': 'No description available',
    'map.selectStartPoint': 'Select start point',
    'map.tab.feed': 'Feed',
    'map.tab.leaderboard': 'Leaderboard',

    // Peak
    'peak.routeCreateError': 'Could not create route for this peak',
    'peak.waypointAddError': 'Could not add waypoint',
    'peak.waypointUpdateError': 'Could not update waypoint',

    // Community
    'community.newChallengeMobile': 'New challenge',
    'community.mineMobile': 'Mine',
    'community.activeMobile': 'Active',

    // Settings
    'settings.mer': 'More',
    'settings.version': 'Version',
    'settings.build': 'Build',
    'settings.administrator': 'Administrator',
    'settings.adminMode': 'Admin mode',
    'settings.signOutConfirm': 'Are you sure you want to log out?',
    'settings.healthKitDesc': 'Automatically fetches workout data, steps and heart rate from HealthKit.',
    'settings.googleFitDesc': 'Automatically fetches workout data, steps and heart rate from Google Fit.',
    'settings.notifTitle': 'Notifications',

    // Global Leaderboard
    'globalLeaderboard.peak': 'Peak',
    'globalLeaderboard.trip': 'Trip',
    'globalLeaderboard.peaks': 'peaks',
    'globalLeaderboard.trips': 'trips',
    'globalLeaderboard.global': 'Global',
    'globalLeaderboard.friends': 'Friends',
    'globalLeaderboard.uniquePeaks': 'Unique peaks',
    'globalLeaderboard.totalTrips': 'Total trips',
    'globalLeaderboard.month': 'Month',
    'globalLeaderboard.year': 'Year',
    'globalLeaderboard.total': 'Total',
    'globalLeaderboard.noFriendCheckins': 'None of your friends have checked in on peaks yet.',
    'globalLeaderboard.noCheckins': 'No check-ins found yet.',

    // Records
    'records.running5km': 'Running 5 km',
    'records.running10km': 'Running 10 km',
    'records.runningHalfMarathon': 'Half Marathon',
    'records.cycling10km': 'Cycling 10 km',
    'records.cycling20km': 'Cycling 20 km',
    'records.cycling50km': 'Cycling 50 km',

    // Peaks List
    'peaksList.awayM': '{n} m away',
    'peaksList.awayKm': '{n} km away',
    'peaksList.reached': 'Reached',
    'peaksList.notReached': 'Not reached',
    'peaksList.peaks': 'peaks',
    'peaksList.searchPlaceholder': 'Search for peaks...',
    'peaksList.noPeaksFound': 'No peaks found',
    'peaksList.noPeaksFoundFor': 'No peaks found for "{query}"',
    'peaksList.changeFilter': 'Try changing your search or filters.',
    
    // Welcome
    'welcome.title': 'Welcome',
  },
};

export const translations = {
  no: { ...rootTranslations.no, ...mobileTranslations.no },
  en: { ...rootTranslations.en, ...mobileTranslations.en },
};

export type TranslationKey = keyof typeof translations.no;