const fmtDate = new Intl.DateTimeFormat("fr-FR");

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
const today = () => new Date().toISOString().slice(0, 10);
const byId = (items, id) => items.find((item) => item.id === id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

const trades = [
  "Maçonnerie / Gros œuvre",
  "Terrassement / VRD",
  "Toiture / Charpente / Couverture",
  "Étanchéité",
  "Menuiseries extérieures",
  "Menuiseries intérieures",
  "Plâtrerie / Cloisons / Isolation",
  "Peinture / Revêtements muraux",
  "Carrelage / Revêtements de sols",
  "Électricité",
  "Plomberie",
  "Chauffage / Climatisation",
  "Ventilation / VMC",
  "Serrurerie / Métallerie",
  "Façade / Ravalement",
  "Piscine",
  "Jardin / Aménagement extérieur",
  "Dépannage urgent",
  "Rénovation complète",
  "Travaux énergétiques",
  "Photovoltaïque",
  "Autre demande"
];

const energyTypes = [
  {
    title: "Isolation",
    text: "Combles, murs, planchers et isolation extérieure pour limiter les déperditions.",
    works: ["Isolation des combles", "Isolation des murs", "Isolation des planchers", "ITE façade"]
  },
  {
    title: "Menuiseries performantes",
    text: "Fenêtres, volets et portes plus efficaces face au soleil, au vent et à l'humidité.",
    works: ["Double vitrage", "Volets roulants", "Portes isolantes", "Protection solaire"]
  },
  {
    title: "Climatisation réversible",
    text: "Confort été et hiver avec une installation adaptée aux logements corses.",
    works: ["Mono-split", "Multi-split", "Gainable", "Entretien"]
  },
  {
    title: "Pompe à chaleur",
    text: "Air/air ou air/eau, une solution économique pour le chauffage et le confort.",
    works: ["PAC air/air", "PAC air/eau", "Remplacement chauffage"]
  },
  {
    title: "Ventilation / VMC",
    text: "Qualité de l'air intérieur, gestion de l'humidité et économies d'énergie.",
    works: ["Simple flux", "Double flux", "Hygroréglable"]
  },
  {
    title: "Photovoltaïque",
    text: "Production solaire, autoconsommation et étude de faisabilité locale.",
    works: ["Panneaux solaires", "Onduleur", "Autoconsommation"]
  }
];

const energyAids = [
  {
    badge: "MPR",
    title: "MaPrimeRénov'",
    source: "Aide nationale · ANAH / France Rénov'",
    summary: "L'aide principale de l'État pour financer une rénovation d'ampleur, des travaux de chauffage ou d'isolation, selon les revenus et le projet.",
    bestFor: "Propriétaires occupants, bailleurs et copropriétaires.",
    points: ["Montant variable selon les revenus", "Cumul possible avec certaines aides locales et CEE", "Travaux réalisés par des professionnels RGE"],
    link: "https://france-renov.gouv.fr/aides/maprimerenov",
    linkLabel: "Voir MaPrimeRénov'"
  },
  {
    badge: "AUE",
    title: "Prime ORELI",
    source: "Aide Corse · AUE",
    summary: "Dispositif régional pour la rénovation énergétique des logements insulaires, avec accompagnement ORELI - Mon Accompagnateur Rénov'.",
    bestFor: "Maisons et appartements en Corse avec projet de rénovation globale.",
    points: ["Objectif de saut de classes énergétiques", "Accompagnement technique et administratif", "Cumul possible avec MaPrimeRénov' selon les cas"],
    link: "https://www.aue.corsica/L-AUE-facilite-la-renovation-energetique-de-votre-logement-individuel-_a1007.html",
    linkLabel: "Découvrir ORELI"
  },
  {
    badge: "CEE",
    title: "Certificats d'économies d'énergie",
    source: "Primes énergie · fournisseurs",
    summary: "Primes proposées par des fournisseurs d'énergie ou délégataires pour encourager certains travaux d'économies d'énergie.",
    bestFor: "Isolation, chauffage performant, équipements économes.",
    points: ["Demande à anticiper avant signature", "Montants variables selon le fournisseur", "Souvent cumulables avec d'autres dispositifs"],
    link: "https://france-renov.gouv.fr/aides/autres-aides-financieres",
    linkLabel: "Voir les autres aides"
  },
  {
    badge: "PTZ",
    title: "Éco-prêt à taux zéro",
    source: "Financement · banque partenaire",
    summary: "Un prêt sans intérêts pour financer des travaux de rénovation énergétique, seul ou en complément d'aides.",
    bestFor: "Reste à charge, bouquet de travaux, rénovation globale.",
    points: ["À demander auprès d'une banque habilitée", "Peut compléter MaPrimeRénov'", "Conditions techniques à vérifier avant travaux"],
    link: "https://france-renov.gouv.fr/aides/autres-aides-financieres",
    linkLabel: "Comprendre l'éco-PTZ"
  },
  {
    badge: "TVA",
    title: "TVA à taux réduit",
    source: "Avantage fiscal · travaux",
    summary: "Certains travaux de rénovation énergétique peuvent bénéficier d'un taux de TVA réduit directement appliqué sur la facture.",
    bestFor: "Logements achevés depuis plus de 2 ans.",
    points: ["Application par l'entreprise", "Attestation parfois nécessaire", "À vérifier selon la nature des travaux"],
    link: "https://www.service-public.gouv.fr/particuliers/vosdroits/N321",
    linkLabel: "Voir Service-Public"
  },
  {
    badge: "LOC",
    title: "Aides locales et collectivités",
    source: "Corse · communes · intercommunalités",
    summary: "Des aides peuvent exister selon la commune, l'intercommunalité, le département ou la Collectivité de Corse.",
    bestFor: "Compléter un plan de financement et réduire le reste à charge.",
    points: ["Disponibilité selon l'adresse du logement", "Critères et budgets variables", "À vérifier avant signature des devis"],
    link: "https://france-renov.gouv.fr/aides/simulation",
    linkLabel: "Estimer mes aides"
  },
  {
    badge: "SOL",
    title: "Chauffe-eau solaire individuel",
    source: "AUE Corse",
    summary: "Prime régionale pour l'installation d'un chauffe-eau solaire individuel, sous conditions et avec installateurs chartés.",
    bestFor: "Production d'eau chaude sanitaire solaire en maison ou logement adapté.",
    points: ["Projet non commencé avant demande", "Recours à des professionnels référencés", "Cumul possible selon le dossier"],
    link: "https://www.aue.corsica/Le-guide-des-primes_a206.html",
    linkLabel: "Voir le guide AUE"
  },
  {
    badge: "COP",
    title: "MaPrimeRénov' Copropriété / MARCO",
    source: "Copropriétés · national et Corse",
    summary: "Aides dédiées aux travaux collectifs : parties communes, rénovation énergétique globale, audit et accompagnement.",
    bestFor: "Syndics, copropriétaires et petites copropriétés.",
    points: ["Vote en assemblée générale", "Audit ou étude énergétique", "AMO souvent obligatoire"],
    link: "https://france-renov.gouv.fr/aides/maprimerenov-copropriete",
    linkLabel: "Voir l'aide copropriété"
  }
];

const seed = {
  page: "home",
  role: "visiteur",
  currentUserEmail: "",
  siteSettings: {
    headline: "Trouvez le bon accompagnement pour vos travaux en Corse",
    intro: "TravauxCorse qualifie votre projet, vous oriente vers des entreprises adaptées et facilite l'achat direct des fournitures auprès de partenaires sélectionnés.",
    contactEmail: "contact@travauxcorse.fr",
    contactPhone: "04 95 00 00 00"
  },
  accounts: [
    { role: "admin", email: "admin@travauxcorse.fr", name: "Administrateur TravauxCorse", password: "admin" },
    { role: "client", email: "sophie@example.fr", name: "Sophie P.", password: "client" },
    { role: "artisan", email: "artisan@travauxcorse.fr", name: "Entreprise partenaire", password: "artisan", artisanId: "art-5" }
  ],
  requestDraft: { step: 0, category: "", title: "", description: "", commune: "", delay: "Sous 1 mois", budget: "", property: "", surface: "", files: "", name: "", email: "", phone: "" },
  filters: { q: "", trade: "", zone: "", energy: false, urgent: false, verified: true },
  supplierPartners: [
    { id: "sup-1", name: "Clim Distribution Corse", family: "Chauffage / Climatisation", zone: "Bastia · Ajaccio", badge: "Matériel pro", text: "Climatisations réversibles, pompes à chaleur air/air, accessoires de pose et consommables.", benefits: ["Devis client direct", "Références compatibles RGE", "Disponibilité stock Corse"] },
    { id: "sup-2", name: "Élec Pro Méditerranée", family: "Électricité", zone: "Toute la Corse", badge: "Électricité", text: "Tableaux, protections, câbles, appareillage et solutions photovoltaïques résidentielles.", benefits: ["Commande préparée", "Conseil technique", "Livraison chantier"] },
    { id: "sup-3", name: "Menuiseries Insulaires", family: "Menuiseries extérieures", zone: "Corse-du-Sud", badge: "Isolation", text: "Fenêtres, portes, volets et menuiseries performantes adaptées au climat corse.", benefits: ["Achat direct client", "Fiches techniques", "Pose coordonnée"] },
    { id: "sup-4", name: "Sanitaire & Plomberie Corse", family: "Plomberie", zone: "Haute-Corse", badge: "Sanitaire", text: "Équipements sanitaires, chauffe-eau, robinetterie, raccords et fournitures plomberie.", benefits: ["Prix négociés réseau", "Retrait comptoir", "Suivi des garanties"] },
    { id: "sup-5", name: "Isolation Méditerranée", family: "Isolation", zone: "Toute la Corse", badge: "Énergie", text: "Isolants combles, murs, planchers, membranes, accessoires et systèmes d'étanchéité à l'air.", benefits: ["Solutions certifiées", "Aide au choix produit", "Quantitatif projet"] },
    { id: "sup-6", name: "Matériaux Bâtiment Corse", family: "Gros œuvre / Second œuvre", zone: "Ajaccio · Porto-Vecchio", badge: "Matériaux", text: "Matériaux de construction, carrelage, peinture, outillage et produits de finition.", benefits: ["Compte projet client", "Livraison groupée", "Remises partenaires"] }
  ],
  artisans: [
    { id: "art-1", name: "Rénovation Globale Corse", city: "Porto-Vecchio", department: "Corse-du-Sud", trades: ["Rénovation complète", "Maçonnerie / Gros œuvre", "Peinture"], energy: ["Rénovation énergétique globale", "Audit énergétique"], rating: 4.9, reviews: 18, status: "Disponible", verified: true, premium: true, urgent: false, insurance: true, photos: true, text: "Rénovation globale clé en main, de l'audit aux travaux, avec accompagnement du projet." },
    { id: "art-2", name: "Plomberie Bastia Services", city: "Bastia", department: "Haute-Corse", trades: ["Plomberie", "Chauffage / Climatisation"], energy: ["Chauffage", "Eau chaude sanitaire"], rating: 4.9, reviews: 15, status: "Intervention urgente", verified: true, premium: false, urgent: true, insurance: true, photos: true, text: "Plombier-chauffagiste pour dépannage, installation et entretien à Bastia." },
    { id: "art-3", name: "Électricité Corse Pro", city: "Bastia", department: "Haute-Corse", trades: ["Électricité", "Dépannage urgent", "Photovoltaïque"], energy: ["Photovoltaïque"], rating: 4.8, reviews: 12, status: "Intervention urgente", verified: true, premium: true, urgent: true, insurance: true, photos: false, text: "Électricien certifié pour installation, dépannage et solaire en Haute-Corse." },
    { id: "art-4", name: "Menuiseries Ajacciennes", city: "Ajaccio", department: "Corse-du-Sud", trades: ["Menuiseries extérieures", "Menuiseries intérieures"], energy: ["Menuiseries énergétiques"], rating: 4.6, reviews: 21, status: "Sur devis", verified: true, premium: false, urgent: false, insurance: true, photos: true, text: "Fenêtres, portes, volets et rénovations de menuiseries sur mesure." },
    { id: "art-5", name: "Clima Balagne", city: "Calvi", department: "Haute-Corse", trades: ["Chauffage / Climatisation", "Ventilation / VMC"], energy: ["Climatisation", "Pompe à chaleur", "Ventilation / VMC"], rating: 4.7, reviews: 9, status: "Disponible", verified: true, premium: false, urgent: false, insurance: true, photos: true, text: "Pose de climatisations réversibles, PAC air/air et entretien en Balagne." },
    { id: "art-6", name: "Toitures du Sud", city: "Ajaccio", department: "Corse-du-Sud", trades: ["Toiture / Charpente / Couverture", "Étanchéité", "Façade / Ravalement"], energy: [], rating: 4.4, reviews: 7, status: "Sur devis", verified: false, premium: false, urgent: false, insurance: false, photos: true, text: "Couverture, charpente, étanchéité et réparations après intempéries." },
    { id: "art-7", name: "Isola Corte", city: "Corte", department: "Haute-Corse", trades: ["Plâtrerie / Cloisons / Isolation", "Travaux énergétiques"], energy: ["Isolation intérieure", "Isolation extérieure"], rating: 4.5, reviews: 11, status: "Disponible", verified: true, premium: true, urgent: false, insurance: true, photos: true, text: "Isolation thermique et rénovation énergétique dans le centre Corse." }
  ],
  requests: [
    { id: "dem-1", date: today(), category: "Chauffage / Climatisation", title: "Remplacement climatisation séjour", commune: "Bastia", delay: "Sous 1 mois", status: "Fournisseur attribué", name: "Sophie P.", email: "sophie@example.fr", phone: "06 00 00 00 00", description: "Remplacer un ancien split mural par une climatisation réversible plus silencieuse.", budget: "2500", property: "Appartement", surface: "68", assignedSupplier: "Clim Distribution Corse", assignedArtisan: "Clima Balagne", assignedArtisanId: "art-5", adminNote: "Fourniture clim à chiffrer chez le partenaire. Artisan pressenti pour visite technique.", timeline: ["Demande déposée", "Projet vérifié", "Fournisseur proposé"] },
    { id: "dem-2", date: today(), category: "Travaux énergétiques", title: "Isolation combles maison", commune: "Ajaccio", delay: "Sous 3 mois", status: "En qualification", name: "Marc L.", email: "marc@example.fr", phone: "06 11 11 11 11", description: "Améliorer le confort d'été et réduire la facture énergétique.", budget: "6000", property: "Maison", surface: "110", assignedSupplier: "", assignedArtisan: "", assignedArtisanId: "", adminNote: "Vérifier éligibilité ORELI / MaPrimeRénov'.", timeline: ["Demande déposée", "Analyse administrative en cours"] }
  ],
  partners: [
    { id: "par-1", date: today(), company: "Maçonnerie Exemple", manager: "Jean Rossi", trade: "Maçonnerie / Gros œuvre", zone: "Haute-Corse", status: "À valider", email: "contact@exemple.fr", phone: "06 22 22 22 22" }
  ],
  selectedArtisan: null
};

let state = loadState();

function loadState() {
  try {
    const stored = localStorage.getItem("travaux-corse-state");
    return normalizeState(stored ? { ...structuredClone(seed), ...JSON.parse(stored) } : structuredClone(seed));
  } catch {
    return normalizeState(structuredClone(seed));
  }
}

function normalizeState(next) {
  next.siteSettings = { ...seed.siteSettings, ...(next.siteSettings || {}) };
  next.accounts = next.accounts?.length ? next.accounts : structuredClone(seed.accounts);
  next.currentUserEmail = next.currentUserEmail || "";
  next.supplierPartners = next.supplierPartners?.length ? next.supplierPartners : structuredClone(seed.supplierPartners);
  next.requests = (next.requests || []).map((request) => {
    const demo = request.id === "dem-1" ? byId(seed.requests, "dem-1") : null;
    return {
      assignedSupplier: demo?.assignedSupplier || "",
      assignedArtisan: demo?.assignedArtisan || "",
      assignedArtisanId: demo?.assignedArtisanId || "",
      adminNote: demo?.adminNote || "",
      timeline: demo?.timeline || ["Demande déposée"],
      ...request,
      assignedSupplier: request.assignedSupplier || demo?.assignedSupplier || "",
      assignedArtisan: request.assignedArtisan || demo?.assignedArtisan || "",
      assignedArtisanId: request.assignedArtisanId || demo?.assignedArtisanId || "",
      adminNote: request.adminNote || demo?.adminNote || "",
      timeline: request.timeline?.length ? request.timeline : demo?.timeline || ["Demande déposée"]
    };
  });
  return next;
}

function saveState() {
  localStorage.setItem("travaux-corse-state", JSON.stringify(state));
}

function setPage(page) {
  state.page = page;
  saveState();
  render();
  scrollTo({ top: 0, behavior: "smooth" });
}

function cta(label, page, cls = "") {
  return `<button class="${cls}" data-page="${page}">${label}</button>`;
}

function render() {
  document.querySelector("#app").innerHTML = `
    <div class="site-shell">
      ${renderHeader()}
      <main>${renderPage()}</main>
      ${renderFooter()}
    </div>`;
  bind();
}

function renderHeader() {
  const links = [["home", "Accueil"], ["request", "Déposer une demande"], ["energy", "Travaux énergétiques"], ["suppliers", "Nos partenaires"], ["partner", "Devenir artisan partenaire"], ["login", "Connexion"]];
  return `<header class="site-header">
    <a class="brand" href="#" data-page="home"><span>TRAVAUX</span>CORSE<small>Vos travaux, notre priorité</small></a>
    <button class="menu-button secondary" data-menu>Menu</button>
    <nav class="main-nav" data-nav>${links.map(([page, label]) => `<button class="${state.page === page ? "active" : ""}" data-page="${page}">${label}</button>`).join("")}</nav>
    <button class="primary" data-page="request">Déposer une demande</button>
  </header>`;
}

function renderFooter() {
  return `<footer class="site-footer">
    <div><strong>TRAVAUXCORSE</strong><p>La plateforme locale qui qualifie les demandes, propose les bonnes entreprises et facilite l'achat direct des fournitures auprès de partenaires.</p><p>Haute-Corse & Corse-du-Sud</p></div>
    <div><strong>Services</strong><button data-page="request">Déposer une demande</button><button data-page="suppliers">Nos partenaires</button><button data-page="energy">Travaux énergétiques</button></div>
    <div><strong>Espaces</strong><button data-page="client">Espace client</button><button data-page="artisanSpace">Espace artisan</button><button data-page="admin">Administration</button></div>
    <p class="legal">TravauxCorse qualifie les projets et oriente les clients vers des entreprises adaptées. Les fournitures peuvent être achetées directement par le client auprès de fournisseurs partenaires selon le projet.</p>
  </footer>`;
}

function renderPage() {
  window.TravauxCorsePortal?.ensure(state);
  const pages = {
    home: renderHome,
    request: renderRequest,
    suppliers: renderSuppliers,
    energy: renderEnergy,
    partner: renderPartner,
    login: () => window.TravauxCorsePortal.render("auth", state),
    auth: () => window.TravauxCorsePortal.render("auth", state),
    signin: () => window.TravauxCorsePortal.render("signin", state),
    registerClient: () => window.TravauxCorsePortal.render("registerClient", state),
    registerCompany: () => window.TravauxCorsePortal.render("registerCompany", state),
    registerPartner: () => window.TravauxCorsePortal.render("registerPartner", state),
    forgot: () => window.TravauxCorsePortal.render("forgot", state),
    client: () => window.TravauxCorsePortal.render("client", state),
    artisanSpace: () => window.TravauxCorsePortal.render("company", state),
    partnerSpace: () => window.TravauxCorsePortal.render("partner", state),
    admin: () => window.TravauxCorsePortal.render("admin", state)
  };
  return (pages[state.page] || renderHome)();
}

function renderHome() {
  return `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Vos travaux, notre priorité</p>
        <h1>${escapeHtml(state.siteSettings.headline)}</h1>
        <p>${escapeHtml(state.siteSettings.intro)}</p>
      <div class="hero-actions">${cta("Déposer une demande", "request", "primary")}${cta("Découvrir nos partenaires", "suppliers", "secondary")}</div>
      </div>
      <div class="quick-card">
        <h2>Commencez en 30 secondes</h2>
        <label>Type de travaux</label>
        <select data-home-category>${trades.slice(0, 11).map((t) => `<option>${t}</option>`).join("")}</select>
        <label>Commune du chantier</label>
        <input data-home-commune placeholder="Ex : Bastia" />
        <label>Délai</label>
        <select data-home-delay><option>Urgent</option><option>Sous 1 mois</option><option>Sous 3 mois</option><option>Pas de délai précis</option></select>
        <button class="primary" data-start-request>Déposer une demande</button>
        <p class="muted">Gratuit, sans engagement, réponse rapide.</p>
      </div>
    </section>
    <section class="stats">
      ${stat("+150", "Entreprises & partenaires")}${stat("+500", "Demandes traitées")}${stat("2", "Départements couverts")}${stat("20", "Catégories de travaux")}
    </section>
    <section class="band">
      <p class="eyebrow">Simple et efficace</p>
      <h2>Comment ça marche ?</h2>
      <div class="steps">${["Décrivez votre projet", "La demande est vérifiée", "Nous proposons les entreprises", "Vous gardez la maîtrise"].map((title, i) => `<article><span>${String(i + 1).padStart(2, "0")}</span><h3>${title}</h3><p>${["Indiquez votre besoin, votre commune, votre délai et votre budget.", "TravauxCorse analyse votre demande avant transmission.", "Nous orientons votre projet vers des entreprises adaptées.", "Vous échangez, comparez et achetez vos fournitures en direct si besoin."][i]}</p></article>`).join("")}</div>
    </section>
    <section class="section">
      <div class="section-head"><p class="eyebrow">Tous corps de métier</p><h2>Types de travaux</h2><p>Quel que soit votre projet, TravauxCorse qualifie votre demande et vous oriente vers les bonnes entreprises.</p></div>
      <div class="work-grid">${trades.slice(0, 16).map((trade) => workCard(trade, trade.includes("énergétiques") || trade.includes("Isolation") || trade.includes("Climatisation"))).join("")}</div>
    </section>
    ${renderEnergyIntro()}
  `;
}

function stat(value, label) {
  return `<article><strong>${value}</strong><span>${label}</span></article>`;
}

function workCard(title, energy = false) {
  const desc = {
    "Maçonnerie / Gros œuvre": "Gros œuvre, fondations, murs porteurs",
    "Plomberie": "Installation, dépannage, rénovation sanitaire",
    "Électricité": "Mise aux normes, installation, dépannage",
    "Chauffage / Climatisation": "Pose de climatiseurs, entretien, dépannage",
    "Toiture / Charpente / Couverture": "Couverture, charpente, étanchéité",
    "Dépannage urgent": "Intervention rapide toutes urgences"
  }[title] || "Demande qualifiée auprès d'entreprises locales";
  return `<article class="work-card"><div>${energy ? `<span class="pill">Énergie</span>` : ""}<h3>${title}</h3><p>${desc}</p></div><button class="secondary" data-request-category="${escapeHtml(title)}">Faire une demande</button></article>`;
}

function renderEnergyIntro() {
  return `<section class="energy-band">
    <p class="eyebrow">Éco-rénovation</p>
    <h2>Vos travaux énergétiques en Corse</h2>
    <p>Isolation, menuiseries performantes, climatisation réversible, pompe à chaleur, ventilation, eau chaude sanitaire ou photovoltaïque : TravauxCorse vous aide à trouver les bons professionnels.</p>
    <div class="energy-list">${energyTypes.slice(0, 6).map((e) => `<article><h3>${e.title}</h3><p>${e.text}</p></article>`).join("")}</div>
    <div class="hero-actions">${cta("Voir les travaux énergétiques", "energy", "primary")}${cta("Déposer une demande énergétique", "request", "secondary")}</div>
  </section>`;
}

function renderRequest() {
  const d = state.requestDraft;
  const steps = ["Type de travaux", "Votre projet", "Votre bien", "Photos & docs", "Coordonnées", "Confirmation"];
  return `<section class="page-section narrow">
    <p class="eyebrow">Gratuit · Sans engagement · Réponse rapide</p>
    <h1>Déposer une demande</h1>
    <div class="progress"><div style="width:${(d.step / 5) * 100}%"></div></div>
    <div class="stepper">${steps.map((s, i) => `<button class="${d.step === i ? "active" : ""}" data-step="${i}"><span>${i + 1}</span>${s}</button>`).join("")}</div>
    <form class="form-panel" data-request-form>${renderRequestStep()}</form>
  </section>`;
}

function renderRequestStep() {
  const d = state.requestDraft;
  if (d.step === 0) return `<h2>Type de travaux</h2><p>Sélectionnez la catégorie correspondant à votre besoin.</p><div class="choice-grid">${trades.map((t) => `<button type="button" class="${d.category === t ? "selected" : ""}" data-category-choice="${escapeHtml(t)}">${t}</button>`).join("")}</div>${stepActions()}`;
  if (d.step === 1) return `<h2>Votre projet</h2><div class="form-grid"><label>Intitulé<input name="title" value="${escapeHtml(d.title)}" placeholder="Ex : rénovation salle de bain" required /></label><label>Délai<select name="delay">${["Urgent", "Sous 1 mois", "Sous 3 mois", "Pas de délai précis"].map((x) => `<option ${d.delay === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label class="full">Description<textarea name="description" placeholder="Décrivez les travaux, contraintes, accès, attentes...">${escapeHtml(d.description)}</textarea></label><label>Budget indicatif<input name="budget" value="${escapeHtml(d.budget)}" placeholder="Ex : 5000" /></label><label>Commune<input name="commune" value="${escapeHtml(d.commune)}" placeholder="Ex : Ajaccio" required /></label></div>${stepActions()}`;
  if (d.step === 2) return `<h2>Votre bien</h2><div class="form-grid"><label>Type de bien<select name="property">${["Maison", "Appartement", "Local professionnel", "Copropriété", "Terrain"].map((x) => `<option ${d.property === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Surface approximative<input name="surface" value="${escapeHtml(d.surface)}" placeholder="m²" /></label><label class="full">Informations utiles<textarea name="files" placeholder="Accès, étage, stationnement, photos disponibles, contraintes...">${escapeHtml(d.files)}</textarea></label></div>${stepActions()}`;
  if (d.step === 3) return `<h2>Photos & documents</h2><p>Pour cette version locale, indiquez les documents disponibles. Dans une version connectée, cette étape peut recevoir des fichiers.</p><label>Documents disponibles<textarea name="files" placeholder="Photos, plans, diagnostics, factures, vidéos...">${escapeHtml(d.files)}</textarea></label>${stepActions()}`;
  if (d.step === 4) return `<h2>Vos coordonnées</h2><div class="form-grid"><label>Nom et prénom<input name="name" value="${escapeHtml(d.name)}" required /></label><label>Téléphone<input name="phone" value="${escapeHtml(d.phone)}" required /></label><label class="full">Email<input type="email" name="email" value="${escapeHtml(d.email)}" required /></label></div>${stepActions()}`;
  return `<h2>Confirmation</h2><div class="summary">${["category", "title", "commune", "delay", "budget", "property", "surface", "name", "email", "phone"].map((k) => `<p><strong>${labelFor(k)}</strong><span>${escapeHtml(d[k] || "Non renseigné")}</span></p>`).join("")}</div><label class="full">Description<textarea name="description">${escapeHtml(d.description)}</textarea></label><div class="actions"><button type="button" class="secondary" data-prev>Retour</button><button type="submit" class="primary">Envoyer la demande</button></div>`;
}

function labelFor(key) {
  return ({ category: "Catégorie", title: "Projet", commune: "Commune", delay: "Délai", budget: "Budget", property: "Bien", surface: "Surface", name: "Nom", email: "Email", phone: "Téléphone" })[key] || key;
}

function stepActions() {
  return `<div class="actions">${state.requestDraft.step > 0 ? `<button type="button" class="secondary" data-prev>Retour</button>` : ""}<button type="submit" class="primary">Suivant</button></div>`;
}

function renderArtisans() {
  const f = state.filters;
  const artisans = filteredArtisans();
  return `<section class="page-section">
    <div class="section-head"><h1>Trouvez un artisan en Corse</h1><p>Recherchez une entreprise locale selon votre type de travaux, votre commune ou votre zone d'intervention.</p></div>
    <div class="finder">
      <aside class="filters">
        <div class="panel-head"><h2>Filtres</h2><button class="secondary" data-reset-filters>Réinitialiser</button></div>
        <label>Mot-clé<input data-filter="q" value="${escapeHtml(f.q)}" placeholder="Entreprise, métier..." /></label>
        <label>Métier<select data-filter="trade"><option value="">Tous les métiers</option>${trades.map((t) => `<option ${f.trade === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <label>Zone<select data-filter="zone"><option value="">Toutes les zones</option>${["Ajaccio", "Bastia", "Calvi", "Corte", "Porto-Vecchio", "Haute-Corse", "Corse-du-Sud"].map((z) => `<option ${f.zone === z ? "selected" : ""}>${z}</option>`).join("")}</select></label>
        ${checkFilter("energy", "Travaux énergétiques")}${checkFilter("urgent", "Intervention urgente")}${checkFilter("verified", "Artisan validé uniquement")}
      </aside>
      <div class="results">
        <h2>${artisans.length} artisans trouvés</h2>
        <div class="artisan-list">${artisans.map(renderArtisanCard).join("") || `<div class="notice">Aucun artisan ne correspond aux filtres.</div>`}</div>
      </div>
    </div>
  </section>`;
}

function checkFilter(key, label) {
  return `<label class="check"><input type="checkbox" data-filter="${key}" ${state.filters[key] ? "checked" : ""} />${label}</label>`;
}

function filteredArtisans() {
  const f = state.filters;
  const q = f.q.toLowerCase();
  return state.artisans.filter((a) => {
    const hay = [a.name, a.city, a.department, a.text, ...a.trades, ...a.energy].join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!f.trade || a.trades.includes(f.trade)) && (!f.zone || a.city === f.zone || a.department === f.zone) && (!f.energy || a.energy.length) && (!f.urgent || a.urgent) && (!f.verified || a.verified);
  });
}

function renderArtisanCard(a) {
  return `<article class="artisan-card">
    <div class="avatar">${escapeHtml(a.name[0])}</div>
    <div>
      <div class="card-top"><h3>${escapeHtml(a.name)}</h3><strong>${a.rating} / 5</strong></div>
      <p class="muted">${escapeHtml(a.city)} · ${escapeHtml(a.department)} · ${a.reviews} avis</p>
      <p>${escapeHtml(a.text)}</p>
      <div class="chips">${a.verified ? `<span>Artisan validé</span>` : ""}${a.energy.length ? `<span>Travaux énergétiques</span>` : ""}<span>${escapeHtml(a.status)}</span>${a.premium ? `<span>Premium</span>` : ""}</div>
      <div class="tags">${[...a.trades, ...a.energy].slice(0, 6).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
      <div class="actions"><button class="secondary" data-artisan="${a.id}">Voir la fiche</button><button class="primary" data-request-category="${escapeHtml(a.trades[0])}">Devis</button></div>
      ${state.selectedArtisan === a.id ? renderArtisanDetails(a) : ""}
    </div>
  </article>`;
}

function renderArtisanDetails(a) {
  return `<div class="details"><p><strong>Zones :</strong> ${escapeHtml(a.city)}, ${escapeHtml(a.department)}</p><p><strong>Garanties :</strong> ${a.insurance ? "Assurances renseignées" : "Assurances à compléter"} · ${a.photos ? "Réalisations disponibles" : "Photos à venir"}</p><p><strong>Spécialités :</strong> ${escapeHtml([...a.trades, ...a.energy].join(", "))}</p></div>`;
}

function renderSuppliers() {
  return `<section class="page-section">
    <div class="supplier-hero">
      <div>
        <p class="eyebrow">Réseau fournisseurs TravauxCorse</p>
        <h1>Nos partenaires fournisseurs</h1>
        <p>TravauxCorse développe un réseau de fournisseurs de matériaux et d'équipements. Le client peut acheter ses fournitures en direct auprès de partenaires sélectionnés, pendant que l'entreprise se concentre sur la pose, le conseil et la qualité du chantier.</p>
        <div class="actions">${cta("Déposer un projet", "request", "primary")}${cta("Devenir partenaire", "partner", "secondary")}</div>
      </div>
      <aside class="supplier-balance">
        <h2>Pourquoi ce modèle ?</h2>
        <p><strong>Client :</strong> visibilité sur le prix du matériel, achat direct, facture fournisseur claire.</p>
        <p><strong>Artisan :</strong> moins d'avance de trésorerie, moins de risque sur la fourniture, chantier plus fluide.</p>
      </aside>
    </div>

    <div class="supply-flow">
      ${[
        ["1", "Demande qualifiée", "Le besoin client est cadré : travaux, commune, budget, urgence, contraintes."],
        ["2", "Fourniture identifiée", "TravauxCorse aide à distinguer matériel, pose et prestations nécessaires."],
        ["3", "Achat direct", "Le client peut acheter auprès d'un fournisseur partenaire selon le projet."],
        ["4", "Pose facilitée", "L'entreprise intervient sans immobiliser sa trésorerie sur le matériel."]
      ].map(([n, title, text]) => `<article><span>${n}</span><h3>${title}</h3><p>${text}</p></article>`).join("")}
    </div>

    <div class="section-head supplier-head">
      <p class="eyebrow">Matériel, équipements, matériaux</p>
      <h2>Un réseau pensé pour les chantiers corses</h2>
      <p>Les partenaires présentés ci-dessous sont des exemples de familles que la plateforme peut référencer : chauffage, climatisation, électricité, menuiseries, isolation, sanitaire et matériaux.</p>
    </div>

    <div class="supplier-grid">${state.supplierPartners.map(renderSupplierCard).join("")}</div>

    <div class="supplier-note">
      <div>
        <p class="eyebrow">Positionnement TravauxCorse</p>
        <h2>Nous ne vendons pas la fourniture à la place du fournisseur.</h2>
        <p>TravauxCorse facilite l'organisation : qualification du besoin, orientation vers les bons interlocuteurs, transparence entre fourniture et main-d'œuvre. Le fournisseur facture le client directement selon ses propres conditions.</p>
      </div>
      <button class="primary" data-page="partner">Proposer mon entreprise</button>
    </div>
  </section>`;
}

function renderSupplierCard(supplier) {
  return `<article class="supplier-card">
    <div class="supplier-badge">${escapeHtml(supplier.badge)}</div>
    <h3>${escapeHtml(supplier.name)}</h3>
    <p class="muted">${escapeHtml(supplier.family)} · ${escapeHtml(supplier.zone)}</p>
    <p>${escapeHtml(supplier.text)}</p>
    <div class="supplier-benefits">${supplier.benefits.map((benefit) => `<span>${escapeHtml(benefit)}</span>`).join("")}</div>
  </article>`;
}

function renderEnergy() {
  return `<section class="page-section">
    <div class="aid-hero">
      <div>
        <p class="eyebrow">Aides rénovation énergétique · Corse</p>
        <h1>Comprendre les aides avant de lancer vos travaux</h1>
        <p>Un guide simple pour repérer les dispositifs utiles : ANAH, MaPrimeRénov', ORELI, CEE, éco-PTZ, TVA réduite et aides locales. Les montants évoluent : vérifiez toujours votre éligibilité avant de signer un devis.</p>
        <div class="actions">${cta("Déposer une demande énergétique", "request", "primary")}<a class="secondary link-button" href="https://france-renov.gouv.fr/aides/simulation" target="_blank" rel="noreferrer">Simuler mes aides</a></div>
      </div>
      <aside class="aid-checklist">
        <h2>À retenir</h2>
        <p><strong>1.</strong> Faites estimer les aides avant la signature du devis.</p>
        <p><strong>2.</strong> Vérifiez que l'entreprise est RGE lorsque c'est exigé.</p>
        <p><strong>3.</strong> Gardez devis, factures, avis d'imposition et justificatifs du logement.</p>
      </aside>
    </div>

    <div class="aid-strip">
      <article><strong>ANAH</strong><span>MaPrimeRénov'</span></article>
      <article><strong>AUE</strong><span>ORELI Corse</span></article>
      <article><strong>CEE</strong><span>Primes énergie</span></article>
      <article><strong>PTZ</strong><span>Financement</span></article>
    </div>

    <div class="section-head aid-head">
      <p class="eyebrow">Vue d'ensemble</p>
      <h2>Les principales aides à connaître</h2>
      <p>Chaque carte indique l'intérêt du dispositif, les points de vigilance et un lien vers la source officielle.</p>
    </div>
    <div class="aid-grid">${energyAids.map(renderAidCard).join("")}</div>

    <div class="aid-flow">
      <div class="section-head">
        <p class="eyebrow">Parcours conseillé</p>
        <h2>Dans quel ordre avancer ?</h2>
      </div>
      <div class="flow-steps">
        ${["Définir le projet", "Estimer les aides", "Identifier la fourniture", "Déposer les dossiers", "Lancer les travaux"].map((step, index) => `<article><span>${index + 1}</span><h3>${step}</h3><p>${["Isolation, chauffage, ventilation, solaire ou rénovation globale.", "France Rénov' et ORELI permettent d'y voir clair selon votre situation.", "Distinguez matériel, main-d'œuvre et prestations pour un budget transparent.", "Certaines aides doivent être demandées avant devis signé ou chantier lancé.", "Conservez toutes les pièces jusqu'au paiement des aides."][index]}</p></article>`).join("")}
      </div>
    </div>

    <div class="source-panel">
      <div>
        <p class="eyebrow">Liens utiles</p>
        <h2>Sources officielles</h2>
        <p>Pour éviter les mauvaises surprises, basez toujours votre plan de financement sur les sites publics ou organismes gestionnaires.</p>
      </div>
      <div class="source-links">
        <a href="https://france-renov.gouv.fr/aides/simulation" target="_blank" rel="noreferrer">France Rénov' · simulateur</a>
        <a href="https://france-renov.gouv.fr/aides/maprimerenov" target="_blank" rel="noreferrer">MaPrimeRénov'</a>
        <a href="https://www.aue.corsica/L-AUE-facilite-la-renovation-energetique-de-votre-logement-individuel-_a1007.html" target="_blank" rel="noreferrer">ORELI · AUE Corse</a>
        <a href="https://www.aue.corsica/Le-guide-des-primes_a206.html" target="_blank" rel="noreferrer">Guide des primes AUE</a>
        <a href="https://www.service-public.gouv.fr/particuliers/vosdroits/N321" target="_blank" rel="noreferrer">Service-Public · aides et prêts</a>
        <a href="https://france-renov.gouv.fr/annuaires-professionnels/artisan-rge-architecte" target="_blank" rel="noreferrer">Annuaire des professionnels RGE</a>
      </div>
    </div>

    <div class="notice">Information indicative : l'éligibilité dépend du logement, des revenus, de la nature des travaux, des dates de dépôt et des règles en vigueur. TravauxCorse facilite la mise en relation, sans garantir l'obtention d'une aide.</div>
  </section>`;
}

function renderAidCard(aid) {
  return `<article class="aid-card">
    <div class="aid-icon">${escapeHtml(aid.badge)}</div>
    <div class="aid-card-body">
      <p class="aid-source">${escapeHtml(aid.source)}</p>
      <h3>${escapeHtml(aid.title)}</h3>
      <p>${escapeHtml(aid.summary)}</p>
      <div class="aid-best"><strong>Pour qui ?</strong><span>${escapeHtml(aid.bestFor)}</span></div>
      <ul>${aid.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
      <a href="${escapeHtml(aid.link)}" target="_blank" rel="noreferrer">${escapeHtml(aid.linkLabel)}</a>
    </div>
  </article>`;
}

function renderPartner() {
  return `<section class="page-section narrow">
    <p class="eyebrow">Artisans et entreprises du bâtiment</p><h1>Rejoignez le réseau TravauxCorse</h1><p>Recevez des demandes qualifiées, développez votre visibilité locale et valorisez votre savoir-faire auprès de clients en Corse.</p>
    <div class="feature-grid compact">${["Accès aux demandes qualifiées", "Développez votre activité", "Profil professionnel", "Mise en avant Premium"].map((x) => `<article><h3>${x}</h3><p>Une présence claire, locale et orientée projets concrets.</p></article>`).join("")}</div>
    <form class="form-panel" data-partner-form>
      <h2>Demande de partenariat</h2>
      <div class="form-grid">
        <label>Entreprise<input name="company" required /></label><label>Responsable<input name="manager" required /></label>
        <label>Email<input type="email" name="email" required /></label><label>Téléphone<input name="phone" required /></label>
        <label>Métier principal<select name="trade">${trades.map((t) => `<option>${t}</option>`).join("")}</select></label><label>Zone<select name="zone"><option>Haute-Corse</option><option>Corse-du-Sud</option><option>Toute la Corse</option></select></label>
        <label class="full">Présentation<textarea name="message" placeholder="Qualifications, assurances, zones, spécialités..."></textarea></label>
      </div>
      <button class="primary" type="submit">Envoyer ma candidature</button>
    </form>
  </section>`;
}

function renderLogin() {
  return `<section class="login-page">
    <div class="login-panel">
      <a class="brand centered" href="#" data-page="home"><span>TRAVAUX</span>CORSE<small>Vos travaux, notre priorité</small></a>
      <h1>Connexion aux espaces</h1>
      <p>Prototype local : choisissez un profil pour voir exactement ce que chaque utilisateur pourra gérer.</p>
      <div class="login-choice-grid">
        ${loginCard("admin", "Administration", "Valider les demandes, attribuer fournisseurs/artisans, personnaliser le site.", "admin@travauxcorse.fr")}
        ${loginCard("client", "Particulier", "Suivre l'évolution de ses demandes et voir les attributions.", "sophie@example.fr")}
        ${loginCard("artisan", "Artisan", "Voir les chantiers attribués et leur état d'avancement.", "artisan@travauxcorse.fr")}
      </div>
      <form class="login-form" data-login-form>
        <h2>Connexion manuelle</h2>
        <label>Email<input type="email" name="email" value="admin@travauxcorse.fr" /></label>
        <label>Mot de passe<input type="password" name="password" value="admin" /></label>
        <button class="primary">Se connecter</button>
      </form>
      <p class="muted">Comptes de test : admin/admin, client/client, artisan/artisan.</p>
    </div>
  </section>`;
}

function loginCard(role, title, text, email) {
  return `<button class="login-card" data-role-login="${role}"><strong>${title}</strong><span>${text}</span><small>${email}</small></button>`;
}

function renderClientSpace() {
  if (state.role !== "client" && state.role !== "admin") return renderLoginGate("Espace client");
  const requests = state.role === "admin" ? state.requests : state.requests.filter((r) => r.email === state.currentUserEmail);
  return `<section class="page-section">
    ${spaceHeader("Compte particulier", "Espace client", "Suivez l'évolution de vos demandes, les fournisseurs proposés et les entreprises attribuées.")}
    <div class="request-track-grid">${requests.map(renderClientRequest).join("") || `<div class="notice">Aucune demande associée à ce compte.</div>`}</div>
  </section>`;
}

function renderArtisanSpace() {
  if (state.role !== "artisan" && state.role !== "admin") return renderLoginGate("Espace artisan");
  const account = currentAccount();
  const requests = state.role === "admin" ? state.requests.filter((r) => r.assignedArtisanId || r.assignedArtisan) : state.requests.filter((r) => r.assignedArtisanId === account?.artisanId || r.assignedArtisan === account?.name);
  return `<section class="page-section">
    ${spaceHeader("Entreprise partenaire", "Chantiers attribués", "Consultez les demandes qui vous ont été attribuées et les informations utiles avant contact client.")}
    <div class="request-track-grid">${requests.map(renderArtisanRequest).join("") || `<div class="notice">Aucun chantier attribué pour le moment.</div>`}</div>
  </section>`;
}

function currentAccount() {
  return state.accounts.find((account) => account.email === state.currentUserEmail && account.role === state.role);
}

function spaceHeader(eyebrow, title, text) {
  return `<div class="dashboard-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${text}</p><p class="muted">Connecté : ${escapeHtml(currentAccount()?.email || state.currentUserEmail || "admin")}</p></div><button class="secondary" data-logout>Déconnexion</button></div>`;
}

function renderClientRequest(request) {
  return `<article class="tracking-card">
    <div class="card-top"><div><p class="eyebrow">${escapeHtml(request.category)}</p><h3>${escapeHtml(request.title)}</h3><p class="muted">${escapeHtml(request.commune)} · ${escapeHtml(request.delay)} · ${fmtDate.format(new Date(`${request.date}T12:00:00`))}</p></div><span class="status">${escapeHtml(request.status)}</span></div>
    <p>${escapeHtml(request.description)}</p>
    <div class="assignment-grid">
      <div><strong>Fournisseur attribué</strong><span>${escapeHtml(request.assignedSupplier || "En attente")}</span></div>
      <div><strong>Entreprise attribuée</strong><span>${escapeHtml(request.assignedArtisan || "En attente")}</span></div>
    </div>
    ${renderTimeline(request)}
    ${request.adminNote ? `<div class="note-box"><strong>Message TravauxCorse</strong><p>${escapeHtml(request.adminNote)}</p></div>` : ""}
  </article>`;
}

function renderArtisanRequest(request) {
  return `<article class="tracking-card">
    <div class="card-top"><div><p class="eyebrow">${escapeHtml(request.category)}</p><h3>${escapeHtml(request.title)}</h3><p class="muted">${escapeHtml(request.commune)} · ${escapeHtml(request.property || "Bien non précisé")} · ${escapeHtml(request.surface || "?")} m²</p></div><span class="status">${escapeHtml(request.status)}</span></div>
    <p>${escapeHtml(request.description)}</p>
    <div class="assignment-grid">
      <div><strong>Client</strong><span>${escapeHtml(request.name)} · ${escapeHtml(request.phone)}</span></div>
      <div><strong>Fourniture</strong><span>${escapeHtml(request.assignedSupplier || "Non attribuée")}</span></div>
    </div>
    <div class="note-box"><strong>Consigne TravauxCorse</strong><p>${escapeHtml(request.adminNote || "Prendre connaissance du projet et attendre validation avant planification.")}</p></div>
  </article>`;
}

function renderTimeline(request) {
  return `<div class="timeline-line">${(request.timeline || ["Demande déposée"]).map((item, index) => `<span class="${index === (request.timeline || []).length - 1 ? "current" : ""}">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderLoginGate(title) {
  return `<section class="page-section narrow"><div class="notice"><h1>${title}</h1><p>Connectez-vous pour accéder à cet espace.</p><button class="primary" data-page="login">Connexion</button></div></section>`;
}

function renderAdmin() {
  if (state.role !== "admin") return renderLoginGate("Administration");
  return `<section class="page-section">
    ${spaceHeader("Pilotage", "Administration TravauxCorse", "Validez les demandes, attribuez fournisseurs et entreprises, suivez les chantiers et personnalisez le site.")}
    <div class="stats">${stat(state.requests.length, "Demandes")}${stat(state.requests.filter((r) => r.assignedSupplier).length, "Fournisseurs attribués")}${stat(state.requests.filter((r) => r.assignedArtisan).length, "Entreprises attribuées")}${stat(state.partners.length, "Candidatures")}</div>
    <div class="admin-layout">
      <section class="panel admin-wide"><h2>Demandes à gérer</h2><div class="admin-request-list">${state.requests.map(renderAdminRequest).join("")}</div></section>
      <section class="panel"><h2>Personnalisation du site</h2>${renderSiteSettingsForm()}</section>
      <section class="panel"><h2>Candidatures partenaires</h2>${state.partners.map((p) => `<article class="mini"><strong>${escapeHtml(p.company)}</strong><span>${escapeHtml(p.trade)} · ${escapeHtml(p.zone)} · ${escapeHtml(p.status)}</span></article>`).join("")}</section>
    </div>
  </section>`;
}

function renderAdminRequest(request) {
  return `<form class="admin-request-card" data-admin-request="${request.id}">
    <div><p class="eyebrow">${escapeHtml(request.category)}</p><h3>${escapeHtml(request.title)}</h3><p>${escapeHtml(request.name)} · ${escapeHtml(request.commune)} · ${escapeHtml(request.phone)}</p><p class="muted">${escapeHtml(request.description)}</p></div>
    <div class="form-grid">
      <label>Statut<select name="status">${["Nouvelle", "En qualification", "Vérifiée", "Fournisseur attribué", "Entreprise attribuée", "Transmise", "Chantier en cours", "Terminée"].map((s) => `<option ${request.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
      <label>Fournisseur<select name="assignedSupplier"><option value="">Non attribué</option>${state.supplierPartners.map((s) => `<option value="${escapeHtml(s.name)}" ${request.assignedSupplier === s.name ? "selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}</select></label>
      <label>Entreprise / artisan<select name="assignedArtisanId"><option value="">Non attribué</option>${state.artisans.map((a) => `<option value="${a.id}" ${request.assignedArtisanId === a.id ? "selected" : ""}>${escapeHtml(a.name)}</option>`).join("")}</select></label>
      <label class="full">Note visible dans le suivi<textarea name="adminNote">${escapeHtml(request.adminNote || "")}</textarea></label>
    </div>
    <div class="actions"><button class="primary" type="submit">Enregistrer</button></div>
  </form>`;
}

function renderSiteSettingsForm() {
  return `<form class="settings-form" data-site-settings>
    <label>Titre d'accueil<input name="headline" value="${escapeHtml(state.siteSettings.headline)}" /></label>
    <label>Texte d'accueil<textarea name="intro">${escapeHtml(state.siteSettings.intro)}</textarea></label>
    <label>Email public<input name="contactEmail" value="${escapeHtml(state.siteSettings.contactEmail)}" /></label>
    <label>Téléphone public<input name="contactPhone" value="${escapeHtml(state.siteSettings.contactPhone)}" /></label>
    <button class="primary" type="submit">Mettre à jour le site</button>
  </form>`;
}

function bind() {
  document.querySelectorAll("[data-page]").forEach((el) => el.addEventListener("click", (event) => { event.preventDefault(); setPage(el.dataset.page); }));
  document.querySelector("[data-menu]")?.addEventListener("click", () => document.querySelector("[data-nav]")?.classList.toggle("open"));
  document.querySelector("[data-start-request]")?.addEventListener("click", () => {
    state.requestDraft.category = document.querySelector("[data-home-category]")?.value || "";
    state.requestDraft.commune = document.querySelector("[data-home-commune]")?.value || "";
    state.requestDraft.delay = document.querySelector("[data-home-delay]")?.value || "Sous 1 mois";
    state.requestDraft.step = 1;
    setPage("request");
  });
  document.querySelectorAll("[data-request-category]").forEach((el) => el.addEventListener("click", () => {
    state.requestDraft.category = el.dataset.requestCategory;
    if (el.dataset.energySub) state.requestDraft.title = el.dataset.energySub;
    state.requestDraft.step = 1;
    setPage("request");
  }));
  bindRequest();
  bindFilters();
  bindForms();
  window.TravauxCorsePortal?.bind(state, { render, saveState, setPage, uid, today });
}

function bindRequest() {
  document.querySelectorAll("[data-step]").forEach((el) => el.addEventListener("click", () => { state.requestDraft.step = Number(el.dataset.step); saveState(); render(); }));
  document.querySelectorAll("[data-category-choice]").forEach((el) => el.addEventListener("click", () => { state.requestDraft.category = el.dataset.categoryChoice; saveState(); render(); }));
  document.querySelector("[data-prev]")?.addEventListener("click", () => { state.requestDraft.step = Math.max(0, state.requestDraft.step - 1); saveState(); render(); });
  document.querySelector("[data-request-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.forEach((value, key) => { state.requestDraft[key] = value; });
    if (state.requestDraft.step < 5) {
      state.requestDraft.step += 1;
    } else {
      state.requests.unshift({ id: uid("dem"), date: today(), status: "Nouvelle", assignedSupplier: "", assignedArtisan: "", assignedArtisanId: "", adminNote: "Votre demande vient d'être reçue. TravauxCorse va la qualifier.", timeline: ["Demande déposée"], ...state.requestDraft });
      if (state.requestDraft.email && !state.accounts.some((account) => account.email === state.requestDraft.email)) {
        state.accounts.push({ role: "client", email: state.requestDraft.email, name: state.requestDraft.name || "Client", password: "client" });
      }
      state.currentUserEmail = state.requestDraft.email;
      state.requestDraft = structuredClone(seed.requestDraft);
      state.role = "client";
      state.page = "client";
    }
    saveState();
    render();
  });
}

function bindFilters() {
  document.querySelectorAll("[data-filter]").forEach((el) => el.addEventListener("input", () => {
    const key = el.dataset.filter;
    state.filters[key] = el.type === "checkbox" ? el.checked : el.value;
    saveState();
    render();
  }));
  document.querySelector("[data-reset-filters]")?.addEventListener("click", () => {
    state.filters = structuredClone(seed.filters);
    saveState();
    render();
  });
  document.querySelectorAll("[data-artisan]").forEach((el) => el.addEventListener("click", () => {
    state.selectedArtisan = state.selectedArtisan === el.dataset.artisan ? null : el.dataset.artisan;
    saveState();
    render();
  }));
}

function bindForms() {
  document.querySelector("[data-partner-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.partners.unshift({ id: uid("par"), date: today(), status: "À valider", ...data });
    state.role = "artisan";
    state.page = "artisanSpace";
    saveState();
    render();
  });
  document.querySelectorAll("[data-role-login]").forEach((el) => el.addEventListener("click", () => {
    state.role = el.dataset.roleLogin;
    const account = state.accounts.find((item) => item.role === state.role);
    state.currentUserEmail = account?.email || "";
    state.page = el.dataset.roleLogin === "admin" ? "admin" : el.dataset.roleLogin === "artisan" ? "artisanSpace" : "client";
    saveState();
    render();
  }));
  document.querySelector("[data-login-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const account = state.accounts.find((item) => item.email === data.email && item.password === data.password);
    if (!account) {
      alert("Compte introuvable. Utilisez les comptes de test affichés ou choisissez un profil.");
      return;
    }
    state.role = account.role;
    state.currentUserEmail = account.email;
    state.page = account.role === "admin" ? "admin" : account.role === "artisan" ? "artisanSpace" : "client";
    saveState();
    render();
  });
  document.querySelectorAll("[data-admin-request]").forEach((form) => form.addEventListener("submit", (event) => {
    event.preventDefault();
    const request = byId(state.requests, form.dataset.adminRequest);
    if (!request) return;
    const data = Object.fromEntries(new FormData(form));
    const artisan = byId(state.artisans, data.assignedArtisanId);
    request.status = data.status;
    request.assignedSupplier = data.assignedSupplier;
    request.assignedArtisanId = data.assignedArtisanId;
    request.assignedArtisan = artisan?.name || "";
    request.adminNote = data.adminNote;
    request.timeline = buildTimeline(request);
    saveState();
    render();
  }));
  document.querySelector("[data-site-settings]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.siteSettings = { ...state.siteSettings, ...Object.fromEntries(new FormData(event.currentTarget)) };
    saveState();
    render();
  });
  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    state.role = "visiteur";
    state.currentUserEmail = "";
    state.page = "home";
    saveState();
    render();
  });
}

function buildTimeline(request) {
  const timeline = ["Demande déposée"];
  if (!["Nouvelle"].includes(request.status)) timeline.push("Analyse TravauxCorse");
  if (request.assignedSupplier) timeline.push("Fournisseur proposé");
  if (request.assignedArtisan) timeline.push("Entreprise attribuée");
  if (["Chantier en cours", "Terminée"].includes(request.status)) timeline.push(request.status);
  return timeline;
}

render();
