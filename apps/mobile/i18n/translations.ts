export type Language = 'no' | 'en';

const no = {
  // Navigation
  'nav.home': 'Hjem',
  'nav.calendar': 'Kalender',
  'nav.map': 'Kart',
  'nav.training': 'Trening',
  'nav.community': 'Fellesskap',
  'nav.settings': 'Innst.',

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

  // Common
  'common.save': 'Lagre',
  'common.cancel': 'Avbryt',
  'common.delete': 'Slett',
  'common.error': 'Feil',
  'common.loading': 'Laster...',
  'common.search': 'Søk',
  'common.today': 'I dag',
  'common.yesterday': 'I går',
  'common.done': 'Ferdig',
  'common.all': 'Alle',
  'common.points': 'poeng',
  'common.more': 'Mer',
  'common.moh': 'm.o.h',
  'common.appName': 'Treningsappen',
  'common.tomorrow': 'I morgen',
  'common.connect': 'Koble til',
  'common.average': 'Snitt',
  'common.max': 'Maks',

  // Home
  'home.trainingGoals': 'Treningsmål',
  'home.statistics': 'Statistikk',
  'home.thisWeek': 'Denne uken',
  'home.thisMonth': 'Denne måneden',
  'home.last7days': 'Siste 7 dager',

  // Sync status
  'syncStatus.failed': 'Synkronisering feilet',
  'syncStatus.retry': 'Prøv igjen',

  // Report prompt
  'reportPrompt.viewReport': 'Se rapport',

  // Calendar
  'calendar.errorLoading': 'Kunne ikke laste kalenderdata',
  'calendar.weekdays.mon': 'Man',
  'calendar.weekdays.tue': 'Tir',
  'calendar.weekdays.wed': 'Ons',
  'calendar.weekdays.thu': 'Tor',
  'calendar.weekdays.fri': 'Fre',
  'calendar.weekdays.sat': 'Lør',
  'calendar.weekdays.sun': 'Søn',
  'calendar.monthNames.0': 'Januar',
  'calendar.monthNames.1': 'Februar',
  'calendar.monthNames.2': 'Mars',
  'calendar.monthNames.3': 'April',
  'calendar.monthNames.4': 'Mai',
  'calendar.monthNames.5': 'Juni',
  'calendar.monthNames.6': 'Juli',
  'calendar.monthNames.7': 'August',
  'calendar.monthNames.8': 'September',
  'calendar.monthNames.9': 'Oktober',
  'calendar.monthNames.10': 'November',
  'calendar.monthNames.11': 'Desember',

  // Months
  'month.0': 'Januar', 'month.1': 'Februar', 'month.2': 'Mars', 'month.3': 'April',
  'month.4': 'Mai', 'month.5': 'Juni', 'month.6': 'Juli', 'month.7': 'August',
  'month.8': 'September', 'month.9': 'Oktober', 'month.10': 'November', 'month.11': 'Desember',

  // Months short
  'month.short.0': 'Jan', 'month.short.1': 'Feb', 'month.short.2': 'Mar', 'month.short.3': 'Apr',
  'month.short.4': 'Mai', 'month.short.5': 'Jun', 'month.short.6': 'Jul', 'month.short.7': 'Aug',
  'month.short.8': 'Sep', 'month.short.9': 'Okt', 'month.short.10': 'Nov', 'month.short.11': 'Des',

  // Weekdays
  'weekday.mon': 'M', 'weekday.tue': 'T', 'weekday.wed': 'O', 'weekday.thu': 'T',
  'weekday.fri': 'F', 'weekday.sat': 'L', 'weekday.sun': 'S',
  'weekday.long.mon': 'Man', 'weekday.long.tue': 'Tir', 'weekday.long.wed': 'Ons',
  'weekday.long.thu': 'Tor', 'weekday.long.fri': 'Fre', 'weekday.long.sat': 'Lør', 'weekday.long.sun': 'Søn',

  // Map
  'map.tab.map': 'Kart',
  'map.tab.peaks': 'Topper',
  'map.filter.all': 'Alle',
  'map.filter.notTaken': 'Ikke tatt',
  'map.filter.taken': 'Tatt',
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

  // Progress wheel
  'wheel.setGoal': 'Sett mål',
  'wheel.onTrack': 'Du er i rute',
  'wheel.ahead': '{n} {unit} foran skjema',
  'wheel.behind': '{n} {unit} bak skjema',
  'wheel.session': 'økt',
  'wheel.sessions': 'økter',
  'wheel.prognosisLabel': 'Prognose: {n} økter',

  // Weather
  'weather.unavailable': 'Værdata er ikke tilgjengelig for øyeblikket',

  // Workout Detail
  'workoutDetail.delete': 'Slett økt',
  'workoutDetail.confirmDeleteDesc': 'Er du sikker på at du vil slette "{name}"? Denne handlingen kan ikke angres.',
  'workoutDetail.deleteError': 'Kunne ikke slette økten.',
  'workoutDetail.avgMax': 'Gjennomsnitt / Maks',
  'workoutDetail.calories': 'Kalorier',
  'workoutDetail.mapUnavailableWeb': 'Kartet er kun tilgjengelig i appen',

  // Workout
  'workout.h': 't',
  'workout.min': 'min',
  'workout.sec': 'sek',

  // Training
  'training.statistics': 'Statistikk',
  'training.history': 'Historikk',
  'training.goals': 'Mål',
  'training.records': 'Rekorder',

  // Metrics
  'metric.sessions': 'økter',
  'metric.minutes': 'timer',
  'metric.distance': 'km',
  'metric.elevation': 'm',
  'metric.sessions.label': 'Økter',
  'metric.minutes.label': 'Tid',
  'metric.distance.label': 'Distanse',
  'metric.elevation.label': 'Høydemeter',

  // Stats
  'stats.sessions': 'Økter',
  'stats.time': 'Tid',
  'stats.distance': 'Distanse',
  'stats.elevation': 'Høydemeter',

  // Goals
  'goals.otherGoals': 'Andre mål',

  // Goal card
  'goalCard.thisWeek': 'Denne uken',
  'goalCard.thisMonth': 'Denne måneden',
  'goalCard.thisYear': 'I år',
  'goalCard.daysLeft': 'dager igjen',
  'goalCard.reached': '✓ Nådd!',
  'goalCard.onTrack': 'I rute',
  'goalCard.ahead': 'Foran skjema',
  'goalCard.behind': 'Bak skjema',
  'goalCard.remaining': 'igjen',

  // Activity types
  'activity.styrke': 'Styrke', 'activity.løping': 'Løping', 'activity.fjelltur': 'Fjelltur',
  'activity.svømming': 'Svømming', 'activity.sykling': 'Sykling', 'activity.gå': 'Gå',
  'activity.tennis': 'Tennis', 'activity.yoga': 'Yoga', 'activity.fotball': 'Fotball', 'activity.trappemaskin': 'Trappemaskin',
  'activity.roing': 'Roing', 'activity.kajakk': 'Kajakk', 'activity.tredemølle': 'Tredemølle', 'activity.annet': 'Annet',

  // Community
  'community.newChallengeMobile': 'Ny utfordring',
  'community.mineMobile': 'Mine',
  'community.activeMobile': 'Aktive',

  // Settings
  'settings.language': 'Språk',
  'settings.languageNo': 'Norsk',
  'settings.languageEn': 'English',
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
};

const en = {
  // Navigation
  'nav.home': 'Home',
  'nav.calendar': 'Calendar',
  'nav.map': 'Map',
  'nav.training': 'Training',
  'nav.community': 'Community',
  'nav.settings': 'Settings',

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

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.error': 'Error',
  'common.loading': 'Loading...',
  'common.search': 'Search',
  'common.today': 'Today',
  'common.yesterday': 'Yesterday',
  'common.done': 'Done',
  'common.all': 'All',
  'common.points': 'points',
  'common.more': 'More',
  'common.moh': 'm.a.s.l',
  'common.appName': 'The Training App',
  'common.tomorrow': 'Tomorrow',
  'common.connect': 'Connect',
  'common.average': 'Avg',
  'common.max': 'Max',

  // Home
  'home.trainingGoals': 'Training goals',
  'home.statistics': 'Statistics',
  'home.thisWeek': 'This week',
  'home.thisMonth': 'This month',
  'home.last7days': 'Last 7 days',

  // Sync status
  'syncStatus.failed': 'Sync failed',
  'syncStatus.retry': 'Try again',

  // Report prompt
  'reportPrompt.viewReport': 'View report',

  // Calendar
  'calendar.errorLoading': 'Could not load calendar data',
  'calendar.weekdays.mon': 'Mon',
  'calendar.weekdays.tue': 'Tue',
  'calendar.weekdays.wed': 'Wed',
  'calendar.weekdays.thu': 'Thu',
  'calendar.weekdays.fri': 'Fri',
  'calendar.weekdays.sat': 'Sat',
  'calendar.weekdays.sun': 'Sun',
  'calendar.monthNames.0': 'January',
  'calendar.monthNames.1': 'February',
  'calendar.monthNames.2': 'March',
  'calendar.monthNames.3': 'April',
  'calendar.monthNames.4': 'May',
  'calendar.monthNames.5': 'June',
  'calendar.monthNames.6': 'July',
  'calendar.monthNames.7': 'August',
  'calendar.monthNames.8': 'September',
  'calendar.monthNames.9': 'October',
  'calendar.monthNames.10': 'November',
  'calendar.monthNames.11': 'December',

  // Months
  'month.0': 'January', 'month.1': 'February', 'month.2': 'March', 'month.3': 'April',
  'month.4': 'May', 'month.5': 'June', 'month.6': 'July', 'month.7': 'August',
  'month.8': 'September', 'month.9': 'October', 'month.10': 'November', 'month.11': 'December',

  // Months short
  'month.short.0': 'Jan', 'month.short.1': 'Feb', 'month.short.2': 'Mar', 'month.short.3': 'Apr',
  'month.short.4': 'May', 'month.short.5': 'Jun', 'month.short.6': 'Jul', 'month.short.7': 'Aug',
  'month.short.8': 'Sep', 'month.short.9': 'Oct', 'month.short.10': 'Nov', 'month.short.11': 'Dec',

  // Weekdays
  'weekday.mon': 'M', 'weekday.tue': 'T', 'weekday.wed': 'W', 'weekday.thu': 'T',
  'weekday.fri': 'F', 'weekday.sat': 'S', 'weekday.sun': 'S',
  'weekday.long.mon': 'Mon', 'weekday.long.tue': 'Tue', 'weekday.long.wed': 'Wed',
  'weekday.long.thu': 'Thu', 'weekday.long.fri': 'Fri', 'weekday.long.sat': 'Sat', 'weekday.long.sun': 'Sun',

  // Map
  'map.tab.map': 'Map',
  'map.tab.peaks': 'Peaks',
  'map.filter.all': 'All',
  'map.filter.notTaken': 'Not visited',
  'map.filter.taken': 'Visited',
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

  // Progress wheel
  'wheel.setGoal': 'Set goal',
  'wheel.onTrack': "You're on track",
  'wheel.ahead': '{n} {unit} ahead of schedule',
  'wheel.behind': '{n} {unit} behind schedule',
  'wheel.session': 'workout',
  'wheel.sessions': 'workouts',
  'wheel.prognosisLabel': 'Prognosis: {n} workouts',

  // Weather
  'weather.unavailable': 'Weather data is currently unavailable',

  // Workout Detail
  'workoutDetail.delete': 'Delete session',
  'workoutDetail.confirmDeleteDesc': 'Are you sure you want to delete "{name}"? This action cannot be undone.',
  'workoutDetail.deleteError': 'Could not delete session.',
  'workoutDetail.avgMax': 'Average / Max',
  'workoutDetail.calories': 'Calories',
  'workoutDetail.mapUnavailableWeb': 'The map is only available in the app',

  // Workout
  'workout.h': 'h',
  'workout.min': 'min',
  'workout.sec': 'sec',

  // Training
  'training.statistics': 'Statistics',
  'training.history': 'History',
  'training.goals': 'Goals',
  'training.records': 'Records',

  // Metrics
  'metric.sessions': 'workouts',
  'metric.minutes': 'hours',
  'metric.distance': 'km',
  'metric.elevation': 'm',
  'metric.sessions.label': 'Workouts',
  'metric.minutes.label': 'Time',
  'metric.distance.label': 'Distance',
  'metric.elevation.label': 'Elevation',

  // Stats
  'stats.sessions': 'Workouts',
  'stats.time': 'Time',
  'stats.distance': 'Distance',
  'stats.elevation': 'Elevation',

  // Goals
  'goals.otherGoals': 'Other goals',

  // Goal card
  'goalCard.thisWeek': 'This week',
  'goalCard.thisMonth': 'This month',
  'goalCard.thisYear': 'This year',
  'goalCard.daysLeft': 'days left',
  'goalCard.reached': '✓ Reached!',
  'goalCard.onTrack': 'On track',
  'goalCard.ahead': 'Ahead of schedule',
  'goalCard.behind': 'Behind schedule',
  'goalCard.remaining': 'remaining',

  // Activity types
  'activity.styrke': 'Strength', 'activity.løping': 'Running', 'activity.fjelltur': 'Hiking',
  'activity.svømming': 'Swimming', 'activity.sykling': 'Cycling', 'activity.gå': 'Walking',
  'activity.tennis': 'Tennis', 'activity.yoga': 'Yoga', 'activity.fotball': 'Football', 'activity.trappemaskin': 'Stair Climber',
  'activity.roing': 'Rowing', 'activity.kajakk': 'Kayak', 'activity.tredemølle': 'Treadmill', 'activity.annet': 'Other',

  // Community
  'community.newChallengeMobile': 'New challenge',
  'community.mineMobile': 'Mine',
  'community.activeMobile': 'Active',

  // Settings
  'settings.language': 'Language',
  'settings.languageNo': 'Norsk',
  'settings.languageEn': 'English',
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
};

export const translations: Record<Language, Record<string, string>> = { no, en };

export type TranslationKey = keyof typeof no;