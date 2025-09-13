// Species (Arten)
export const SPECIES_TAGS = {
  human: {
    label: "Mensch",
    description: "Normale Menschen ohne übernatürliche Kräfte."
  },
  demon: {
    label: "Dämon",
    description: "Übernatürliches Wesen, oft mit magischen Kräften."
  },
  yokai: {
    label: "Yōkai/Geist",
    description: "Geister oder traditionelle japanische Fabelwesen."
  },
  android: {
    label: "Android/Cyborg",
    description: "Künstlich geschaffene oder verbesserte Wesen."
  },
  vampire: {
    label: "Vampir",
    description: "Wesen mit Blutsaug-Fähigkeiten, oft unsterblich."
  },
  homunculus: {
    label: "Homunculus",
    description: "Künstlich erschaffenes Wesen aus Alchemie oder Magie."
  },
  shapeshifter: {
    label: "Gestaltwandler",
    description: "Kann seine äußere Form oder Identität verändern."
  },
  fairy: {
    label: "Fee",
    description: "Kleines magisches Wesen, oft naturverbunden."
  },
  god: {
    label: "Gottheit",
    description: "Übermächtiges, göttliches Wesen."
  },
  mutant: {
    label: "Mutant",
    description: "Wesen mit besonderen Kräften durch Mutation."
  },
  ghost: {
    label: "Geist",
    description: "Seele oder Erscheinung Verstorbener."
  },
  alien: {
    label: "Alien",
    description: "Außerirdisches Wesen von einem anderen Planeten."
  },
  saiyan: {
    label: "Saiyajin",
    description: "Kriegerische Alien-Spezies aus Dragon Ball."
  },
  beastman: {
    label: "Tiermensch",
    description: "Hybride Wesen mit menschlichen und tierischen Eigenschaften."
  },
  angel: {
    label: "Engel",
    description: "Himmlisches, oft wohlwollendes Wesen mit Flügeln."
  },
  esper: { label: "Esper", description: "Besitzt übernatürliche Kräfte wie das Geass." },
};

// Haarfarbe
export const HAIR_COLOR_TAGS = {
    bald: { label: "Kahl", description: "Völlig ohne Haare, glatzköpfig." },
  blond: { label: "Blond", description: "Helle gelbliche Haarfarbe." },
  black: { label: "Schwarz", description: "Sehr dunkle bis tiefschwarze Haare." },
  blue: { label: "Blau", description: "Unnatürliche blaue Haarfarbe, oft stilistisch." },
  red: { label: "Rot", description: "Kräftige rote oder rötliche Haarfarbe." },
  purple: { label: "Lila", description: "Violette oder purpurne Haarfarbe." },
  turquoise: { label: "Türkis", description: "Bläulich-grüne Haarfarbe." },
  white: { label: "Weiß", description: "Sehr helle, fast farblose Haarfarbe." },
  gold: { label: "Gold", description: "Leuchtend goldfarbene Haare, oft symbolisch." },
  light: { label: "Hell", description: "Sehr helle, aber nicht reinweiße Haarfarbe." },
  dark: { label: "Dunkel", description: "Dunklere Haarfarbe, unbestimmt." },
  brown: { label: "Braun", description: "Häufige, natürliche Haarfarbe in verschiedenen Tönen." },
  gray: { label: "Grau", description: "Silbrig oder alt wirkende Haarfarbe." },
  multicolor: { label: "Mehrfarbig", description: "Haare mit mehreren Farben oder Farbverläufen." },
  green: { label: "Grün", description: "Unnatürliche grüne Haarfarbe." },
  pink: { label: "Pink", description: "Auffällige rosa/pinke Haarfarbe." },
  orange: { label: "Orange", description: "Leuchtend orangefarbene Haare." },
  silver: { label: "Silber", description: "Metallisch schimmernde Haarfarbe." }
};

// Augenfarbe
export const EYE_COLOR_TAGS = {
  blue: { label: "Blau", description: "Kühle bis helle Augenfarbe." },
  green: { label: "Grün", description: "Augen mit grünlicher Färbung." },
  brown: { label: "Braun", description: "Warme, dunklere Augenfarbe." },
  red: { label: "Rot", description: "Übernatürliche oder auffällige rote Augen." },
  purple: { label: "Lila", description: "Violette oder purpurne Augenfarbe." },
  black: { label: "Schwarz", description: "Tiefschwarze Augenfarbe." },
  turquoise: { label: "Türkis", description: "Bläulich-grüne Augenfarbe." },
  gold: { label: "Gold", description: "Leuchtende, edel wirkende Augenfarbe." },
  gray: { label: "Grau", description: "Neutral graue Augenfarbe." },
  multicolor: { label: "Mehrfarbig", description: "Ungewöhnliche Augen mit mehreren Farben." },
  pink: { label: "Pink", description: "Auffällige rosa/pinke Augenfarbe." },
  orange: { label: "Orange", description: "Leuchtend orangefarbene Augen." },
  silver: { label: "Silber", description: "Metallisch glänzende Augen." }
};

// Schwierigkeits-Tag
export const DIFFICULTY_TAGS = {
  easy: { label: "Einfach", description: "Sehr bekannter Charakter, leicht zu erraten." },
  medium: { label: "Mittel", description: "Etwas schwerer, erfordert Anime-Wissen." },
  hard: { label: "Schwer", description: "Weniger bekannte Charaktere." }
};

// Klasse (z. B. Rollen/Archetypen)
export const CLASS_TAGS = {
  student: { label: "Schüler", description: "Besucht eine Schule/Universität." },
  warrior: { label: "Kämpfer", description: "Kämpferischer Charakter mit Waffen oder Martial Arts." },
  mage: { label: "Magier", description: "Besitzt magische Kräfte." },
  teacher: { label: "Lehrer", description: "Unterrichtet oder führt Schüler an." },
  pirate: { label: "Pirat", description: "Fährt zur See, oft gesetzlos." },
  military: { label: "Militär", description: "Soldat oder Offizier in einer Armee." },
  detective: { label: "Detektiv", description: "Löst Kriminalfälle und Rätsel." },
  bountyHunter: { label: "Kopfgeldjäger", description: "Verfolgt Personen gegen Belohnung." },
  assassin: { label: "Assassine", description: "Geheimer Auftragsmörder." },
  scientist: { label: "Wissenschaftler", description: "Forscht und entwickelt neues Wissen." },
  ninja: { label: "Ninja", description: "Geheimer Kämpfer mit Tarnung und Techniken." },
  mercenary: { label: "Söldner", description: "Kämpft für Geld, unabhängig von Moral." },
  samurai: { label: "Samurai", description: "Traditioneller japanischer Krieger." },
  shaman: { label: "Schamane", description: "Spiritueller Führer mit Ritualkräften." },
  hero: { label: "Held", description: "Protagonist, rettet oder schützt andere." },
  maid: { label: "Maid", description: "Bedienstete oder ikonischer Archetyp." },
  adventurer: { label: "Abenteurer", description: "Erforscht die Welt auf der Suche nach Erlebnissen." },
  vampireHunter: { label: "Vampirjäger", description: "Jagt Vampire oder ähnliche Kreaturen." },
  actor: { label: "Schauspieler", description: "Steht auf der Bühne oder vor der Kamera." },
  mechaPilot: { label: "Mecha-Pilot", description: "Steuert riesige Roboter." },
  cook: { label: "Koch", description: "Bereitet Speisen zu, oft Teil einer Crew." },
  revolutionary: { label: "Revolutionär", description: "Führt eine Rebellion gegen ein bestehendes System." },
  strategist: { label: "Stratege", description: "Plant komplexe Taktiken und Siege mit Verstand statt Kraft." },
  prince: { label: "Prinz", description: "Adliger Charakter mit königlicher Abstammung." },
  devilFruitUser: { label: "Teufelsfrucht-Nutzer", description: "Besitzt Kräfte durch den Verzehr einer Teufelsfrucht." },
  captain: { label: "Kapitän", description: "Anführer einer Piratencrew oder Gruppe." },
swordsman: { label: "Schwertkämpfer", description: "Beherrscht den Kampf mit Klingen oder Katana." },
orphan: { label: "Waise", description: "Wuchs ohne Eltern auf und musste sich alleine durchschlagen." },
cursed: { label: "Verflucht", description: "Gezeichnet vom Opfermal, ständig von Dämonen verfolgt." },
exorcist: { label: "Exorzist", description: "Bekämpft Geister, Dämonen oder andere übernatürliche Wesen." },
alchemist: { label: "Alchemist", description: "Beherrscht die Kunst der Alchemie, um Materie zu formen oder umzuwandeln." },
autonomousDoll: { label: "Autonome Korrespondenz-Assistentin", description: "Schreibt im Auftrag anderer Briefe, um Gefühle in Worte zu fassen." },

};

// Eigenschaften
export const CHARACTERISTIC_TAGS = {
  shy: { label: "Schüchtern", description: "Zurückhaltendes, introvertiertes Verhalten." },
  brave: { label: "Mutig", description: "Geht Risiken ein und beschützt andere." },
  tsundere: { label: "Tsundere", description: "Wirkt zunächst kalt/streng, zeigt aber weiche Seite." },
  genius: { label: "Genie", description: "Außergewöhnlich intelligent oder talentiert." },
  enigma: { label: "Enigma", description: "Geheimnisvolle, schwer durchschaubare Persönlichkeit." },
  idealist: { label: "Idealist", description: "Glaubt an Ideale und hohe Werte." },
  rebel: { label: "Rebell", description: "Widersetzt sich Regeln und Autoritäten." },
  glutton: { label: "Vielfraß", description: "Liebt es zu essen, oft übermäßig." },
  enthusiast: { label: "Enthusiast", description: "Sehr leidenschaftlich und voller Energie." },
  daredevil: { label: "Draufgänger", description: "Geht Risiken ohne große Vorsicht ein." },
  loner: { label: "Einzelgänger", description: "Bevorzugt es, allein zu sein." },
  badass: { label: "Badass", description: "Cool, furchtlos und beeindruckend." },
  stoic: { label: "Stoiker", description: "Zeigt kaum Emotionen, bleibt ruhig." },
  sleepyhead: { label: "Schlafmütze", description: "Schläft viel oder ist oft müde." },
  sociopath: { label: "Soziopath", description: "Zeigt wenig Empathie oder Moral." },
  madman: { label: "Verrückter", description: "Exzentrisch, chaotisch oder wahnsinnig." },
  eccentric: { label: "Exzentriker", description: "Eigenwillig und ungewöhnlich." },
  hothead: { label: "Heißsporn", description: "Wird schnell wütend oder handelt impulsiv." },
  misanthrope: { label: "Misanthrop", description: "Hegt Abneigung gegenüber Menschen." },
  pessimist: { label: "Pessimist", description: "Neigt dazu, das Schlechte zu erwarten." },
  trickster: { label: "Trickser", description: "Listig, spielt gerne Streiche." },
  clumsy: { label: "Tollpatsch", description: "Stolpert oder macht oft Fehler." },
  childish: { label: "Kindskopf", description: "Naiv oder verspielt wie ein Kind." },
  esper: { label: "Esper", description: "Besitzt übernatürliche, mentale Fähigkeiten." },
  showoff: { label: "Angeber", description: "Stellt gerne seine Fähigkeiten zur Schau." },
  tomboy: { label: "Wildfang", description: "Mädchen mit burschikos-männlichem Verhalten." },
  femmeFatale: { label: "Gefährliche Schönheit", description: "Verführerisch und zugleich bedrohlich." },
  lecher: { label: "Lüstling", description: "Stark sexuell motiviert oder aufdringlich." },
  womanizer: { label: "Schürzenjäger", description: "Flirtet ständig mit Frauen." },
  delinquent: { label: "Delinquent", description: "Gesetzloser oder Schulrüpel." },
  egomaniac: { label: "Egoman", description: "Stellt sein eigenes Ego über alles." },
  precocious: { label: "Frühentwickler", description: "Überraschend reif oder talentiert für das Alter." },
  flatChest: { label: "Pettanko", description: "Mädchen mit sehr kleiner Oberweite (Anime-Trope)." },
  sunshine: { label: "Sonnenschein", description: "Strahlt immer gute Laune aus." },
  optimist: { label: "Optimist", description: "Sieht das Positive in jeder Situation." },
  tragicHero: { label: "Tragischer Held", description: "Opfert sich für ein höheres Ziel, trotz persönlichem Leid." },
  enigmatic: { label: "Geheimnisvoll", description: "Bleibt für andere undurchschaubar und voller Rätsel." },
cleanFreak: { label: "Putzfimmel", description: "Legt extremen Wert auf Sauberkeit und Ordnung." },
humanityStrongest: { label: "Stärkster Soldat der Menschheit", description: "Berüchtigt für außergewöhnliche Kampffähigkeiten." },
sweetTooth: { label: "Naschkatze", description: "Hat eine Vorliebe für Süßigkeiten." },
slouch: { label: "Lässige Haltung", description: "Sitzt oder bewegt sich auf ungewöhnlich lässige Weise." },
insomniac: { label: "Schlafloser", description: "Lebt mit wenig Schlaf, oft wach für lange Ermittlungen." },
alcoholLover: { label: "Trinker", description: "Hat eine Vorliebe für Alkohol, insbesondere Sake." },
fallenIdealist: { label: "Gefallener Idealist", description: "Beginnt mit hohen Idealen, verfällt aber Macht und Hybris." },
chuuni: { label: "Chūnibyō", description: "Übertrieben dramatisch und rollenspielartig im Verhalten." },
loyal: { label: "Loyal", description: "Bleibt Freunden oder Idealen treu, auch in schwierigen Zeiten." },
  directionless: { label: "Orientierungslos", description: "Hat keinen Orientierungssinn und verläuft sich leicht." },
talkNoJutsu: { label: "Talk no Jutsu", description: "Besitzt die Fähigkeit, Feinde mit Worten zu überzeugen und zu Freunden zu machen." },
lazyhead: { label: "Faulpelz", description: "Neigt zu extremer Faulheit und Vermeidung von Arbeit." },
comicRelief: { label: "Comic Relief", description: "Dient oft als humorvolle Auflockerung in ernsten Momenten." },

};
