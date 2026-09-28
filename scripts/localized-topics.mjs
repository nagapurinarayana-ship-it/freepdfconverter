export const LOCALIZED_TOPIC_KEYS = [
  "topic-pdf-word-private",
  "topic-scanned-pdf-word",
  "topic-pdf-word-formatting",
  "topic-ocr-pdf-online",
  "topic-ocr-pdf-accuracy",
  "topic-word-97-2003-pdf",
  "topic-docx-to-pdf",
  "topic-private-pdf",
  "topic-pdf-to-text",
  "topic-compress-target",
  "topic-jpg-mobile",
  "topic-pdf-page-size"
];

export const LOCALIZED_TOPIC_CONTENT = {
  de: {
    "topic-pdf-word-private": {
      slug: "pdf-ohne-upload-zu-word",
      title: "PDF ohne Upload in Word umwandeln | FreePDF Tools",
      description: "Erfahren Sie, wie Sie unterstützte PDF-Dateien lokal im Browser in Word umwandeln und wann OCR für gescannte Seiten nötig ist.",
      eyebrow: "PDF zu Word · privat",
      h1: "PDF ohne Upload in Word umwandeln",
      lead: "Bei unterstützten Arbeitsabläufen bleibt die ausgewählte PDF-Datei im Browser. Das ist besonders nützlich für sensible Dokumente.",
      sections: [["Lokale Verarbeitung", "Der Browser lädt die Anwendung und die benötigten Bibliotheken. Die ausgewählte PDF wird anschließend im Browser gelesen und das DOCX lokal erzeugt."],["Wann OCR nötig ist", "Wenn Text nicht markiert oder kopiert werden kann, handelt es sich oft um einen Scan. Aktivieren Sie für image-only Seiten die lokale englische OCR."],["Ergebnis prüfen", "Kontrollieren Sie Überschriften, Tabellen, Zahlen, Seitenumbrüche und Sonderzeichen im erzeugten DOCX, bevor Sie es weitergeben."]]
    },
    "topic-scanned-pdf-word": {
      slug: "gescanntes-pdf-zu-word",
      title: "Gescannte PDF in Word umwandeln mit OCR | FreePDF Tools",
      description: "Gescannte und bildbasierte PDFs mit lokaler OCR in bearbeitbaren Word-Text umwandeln und typische Erkennungsfehler prüfen.",
      eyebrow: "OCR · gescanntes PDF",
      h1: "Gescannte PDF in Word umwandeln",
      lead: "Ein gescanntes PDF enthält oft nur Bilder. OCR erkennt die sichtbaren Zeichen und erzeugt daraus bearbeitbaren Text.",
      sections: [["Scan erkennen", "Wenn Sie den Text einer Seite nicht markieren können, ist sie wahrscheinlich bildbasiert. Gemischte PDFs können sowohl Text- als auch Scan-Seiten enthalten."],["OCR ausführen", "Die Seite wird lokal gerendert und mit englischer OCR verarbeitet. Das Ergebnis ist eine Rekonstruktion des erkannten Textes und keine pixelgenaue Kopie."],["Wichtige Inhalte prüfen", "Namen, Datumsangaben, Nummern, Tabellen und Spalten sollten mit dem Original verglichen werden."]]
    },
    "topic-pdf-word-formatting": {
      slug: "pdf-zu-word-formatierung",
      title: "PDF zu Word: Formatierung und typische Änderungen | FreePDF Tools",
      description: "Verstehen Sie, warum PDF-zu-Word-Konvertierung Tabellen, Spalten, Bilder, Schriften und Seitenumbrüche verändern kann.",
      eyebrow: "PDF zu Word · Formatierung",
      h1: "PDF zu Word: Was bei der Formatierung passiert",
      lead: "PDF beschreibt ein festes Seitenbild, Word ein bearbeitbares Dokument. Deshalb ist die Konvertierung eine Rekonstruktion.",
      sections: [["Text", "Markierbarer Fließtext lässt sich meist am einfachsten übertragen. Die semantische Struktur von Überschriften oder Absätzen kann trotzdem angepasst werden müssen."],["Tabellen und Spalten", "Positionierte PDF-Elemente sehen für Menschen wie Tabellen oder Spalten aus, enthalten aber nicht immer die gleiche Struktur wie ein Word-Dokument."],["Bilder und Schriften", "Nicht verfügbare Schriften, eingebettete Objekte und komplexe Layouts können sich im DOCX anders darstellen."]]
    },
    "topic-ocr-pdf-online": {
      slug: "ocr-pdf-online",
      title: "OCR PDF online: Gescannte Seiten in Text umwandeln | FreePDF Tools",
      description: "Gescannte PDF-Seiten lokal per OCR erkennen und als Word-DOCX oder TXT ausgeben.",
      eyebrow: "OCR PDF",
      h1: "OCR PDF online",
      lead: "OCR erkennt sichtbare Zeichen aus bildbasierten PDF-Seiten und macht den Inhalt durchsuchbar und editierbar.",
      sections: [["Wann OCR sinnvoll ist", "Nutzen Sie OCR bei Scans, Screenshots oder image-only Seiten, bei denen normale Textextraktion keinen brauchbaren Text liefert."],["Lokale Verarbeitung", "Die PDF-Seite wird im Browser gerendert und der selbst gehostete OCR-Workflow verarbeitet das Bild auf dem Gerät."],["Ergebnis kontrollieren", "Schiefe Scans, schlechte Qualität, Tabellen und ähnliche Zeichen können Erkennungsfehler verursachen."]]
    },
    "topic-ocr-pdf-accuracy": {
      slug: "ocr-pdf-genauigkeit",
      title: "OCR PDF Genauigkeit: Was die Erkennung beeinflusst | FreePDF Tools",
      description: "Erfahren Sie, wie Auflösung, Kontrast, Ausrichtung, Spalten und Tabellen die OCR-Erkennung beeinflussen.",
      eyebrow: "OCR · Genauigkeit",
      h1: "OCR PDF: Genauigkeit verbessern",
      lead: "Die Qualität des Ausgangsscans beeinflusst die OCR oft genauso stark wie die Erkennungssoftware.",
      sections: [["Bildqualität", "Klare, ausreichend große Schrift und guter Kontrast liefern bessere Eingabedaten für die Erkennung."],["Ausrichtung", "Gerade Seiten sind leichter zu verarbeiten als gedrehte oder schräg eingescannte Dokumente."],["Zahlen und Namen", "Ähnliche Zeichen wie 0/O oder 1/l können verwechselt werden. Wichtige Werte müssen mit dem Original geprüft werden."]]
    },
    "topic-word-97-2003-pdf": {
      slug: "word-97-2003-zu-pdf",
      title: "Word 97–2003 DOC in PDF umwandeln | FreePDF Tools",
      description: "Unterstützte Microsoft Word 97–2003 DOC-Dateien lokal im Browser in PDF umwandeln und das Ergebnis prüfen.",
      eyebrow: "DOC · Word 97–2003",
      h1: "Word 97–2003 in PDF umwandeln",
      lead: "Ältere .doc-Dateien verwenden ein anderes internes Format als moderne DOCX-Dateien und benötigen einen passenden Parser.",
      sections: [["Originalformat verwenden", "Benennen Sie eine .doc-Datei nicht einfach in .docx um. Die internen Datenstrukturen sind unterschiedlich."],["Layout prüfen", "Kontrollieren Sie Seitenumbrüche, Tabellen, Schriftarten und eingebettete Objekte in der erzeugten PDF."],["Original behalten", "Bewahren Sie die Ausgangsdatei auf, wenn sie für Archivierung oder Nachweis wichtig ist."]]
    },
    "topic-docx-to-pdf": {
      slug: "docx-zu-pdf",
      title: "DOCX in PDF umwandeln online | FreePDF Tools",
      description: "Unterstützte DOCX-Dateien lokal in PDF umwandeln und wichtige Layout-Eigenschaften vor dem Teilen prüfen.",
      eyebrow: "DOCX · Word zu PDF",
      h1: "DOCX in PDF umwandeln",
      lead: "DOCX ist das moderne Word-Format. PDF eignet sich gut für eine feste, teilbare Seitenansicht.",
      sections: [["Warum PDF", "PDF gibt Empfängern eine stabile seitenorientierte Darstellung für Teilen, Drucken und Einreichen."],["Was sich ändern kann", "Schriftarten, Seitenumbrüche, schwebende Objekte und komplexe Elemente können in der PDF anders erscheinen."],["Datenschutz", "Der unterstützte Workflow erzeugt die PDF lokal im Browser, ohne die Quelldatei an einen Konvertierungsserver zu senden."]]
    },
    "topic-private-pdf": {
      slug: "privater-pdf-konverter",
      title: "Privater PDF-Konverter: Browser-Verarbeitung erklärt | FreePDF Tools",
      description: "Was lokale PDF-Verarbeitung bedeutet, welche Netzwerkzugriffe trotzdem entstehen und wie Sie einen lokalen Workflow prüfen können.",
      eyebrow: "Datenschutz · PDF",
      h1: "Privater PDF-Konverter: Was bedeutet lokal?",
      lead: "Lokale Dokumentverarbeitung bedeutet, dass die ausgewählten Dokumentbytes für den unterstützten Konvertierungsweg im Browser bleiben.",
      sections: [["Website versus Dokument", "Der Browser muss HTML, JavaScript und Bibliotheken laden. Das ist etwas anderes als das Hochladen der ausgewählten Dokumentdatei zur Konvertierung."],["Warum das wichtig ist", "Bei Verträgen, Rechnungen oder persönlichen Unterlagen kann es sinnvoll sein, die Dokumentdaten nicht an einen entfernten Konvertierungsdienst zu übertragen."],["Prüfung", "Netzwerkinspektion und die veröffentlichte Architektur sollten zusammen zeigen, dass die Dokumentbytes nicht an einen Anwendungsserver gesendet werden."]]
    },
    "topic-pdf-to-text": {
      slug: "pdf-zu-text",
      title: "PDF zu Text: Text aus PDFs extrahieren | FreePDF Tools",
      description: "Direkte Textextraktion aus textbasierten PDFs verstehen und erkennen, wann stattdessen OCR nötig ist.",
      eyebrow: "PDF zu Text",
      h1: "PDF zu Text: erst extrahieren, dann OCR",
      lead: "Wenn ein PDF bereits eine Textschicht enthält, ist direkte Textextraktion meist der einfachere Weg.",
      sections: [["Text oder Scan", "Markierbarer Text spricht für direkte Extraktion. Bei reinen Bildern ist OCR notwendig."],["Lesereihenfolge", "PDF-Dateien speichern Positionen. Bei Spalten oder Seitenleisten kann die extrahierte Reihenfolge von der visuellen Darstellung abweichen."],["TXT-Grenzen", "Plain Text enthält keine Schriftarten, Bilder oder exakten Tabellenlinien."]]
    },
    "topic-compress-target": {
      slug: "pdf-auf-zielgroesse-komprimieren",
      title: "PDF auf Zielgröße komprimieren: Grenzen verstehen | FreePDF Tools",
      description: "Warum eine exakte PDF-Zielgröße nicht immer verlustfrei erreichbar ist und welche Qualitätsabwägungen entstehen.",
      eyebrow: "PDF komprimieren",
      h1: "PDF auf eine Zielgröße komprimieren",
      lead: "Strukturkomprimierung kann PDF-Dateien verkleinern, garantiert aber keine exakte Zielgröße für jedes Dokument.",
      sections: [["Warum Ergebnisse variieren", "Textlastige PDFs und bereits komprimierte Bilder reagieren unterschiedlich auf verlustfreie Optimierung."],["Verlustbehaftete Optimierung", "Bei harten Größenlimits können Bildauflösung oder Qualität reduziert werden. Das verändert den Inhalt und ist eine andere Entscheidung."],["Ergebnis prüfen", "Öffnen Sie die komprimierte Datei und prüfen Sie Seitenzahl, Lesbarkeit, Bilder und Links."]]
    },
    "topic-jpg-mobile": {
      slug: "jpg-zu-pdf-auf-dem-handy",
      title: "JPG zu PDF auf dem Handy umwandeln | FreePDF Tools",
      description: "Fotos und Screenshots auf dem Smartphone in PDF umwandeln, Seiten ordnen und die Ausgabe prüfen.",
      eyebrow: "JPG zu PDF · mobil",
      h1: "JPG zu PDF auf dem Handy",
      lead: "Kamerafotos und Screenshots lassen sich direkt im mobilen Browser zu einer PDF-Datei zusammenfassen.",
      sections: [["Bilder auswählen", "Wählen Sie scharfe Bilder und prüfen Sie die gewünschte Reihenfolge."],["Seitengröße", "A4 oder Letter eignen sich für Dokumente; eine bildnahe Seite kann für Fotos oder Screenshots sinnvoll sein."],["Speicher beachten", "Viele große Kamerabilder können im mobilen Browser viel Speicher benötigen. Weniger Seiten pro Durchlauf können stabiler sein."]]
    },
    "topic-pdf-page-size": {
      slug: "pdf-seitengroesse-a4-letter",
      title: "PDF Seitengröße: A4, Letter oder Bildgröße? | FreePDF Tools",
      description: "A4, US Letter und bildorientierte PDF-Seiten vergleichen und die passende Seitengröße für Drucken und Teilen wählen.",
      eyebrow: "PDF Seitengröße",
      h1: "PDF Seitengröße: A4, Letter oder Bild",
      lead: "Die richtige Seitengröße hängt davon ab, ob die PDF gedruckt, eingereicht oder hauptsächlich am Bildschirm angesehen wird.",
      sections: [["A4", "A4 ist für viele Büro-, Formular- und Druckabläufe geeignet und außerhalb der USA weit verbreitet."],["Letter", "US Letter ist in den USA und einigen anderen Workflows üblich. Verwenden Sie es, wenn das Zielsystem Letter erwartet."],["Bildgröße", "Eine bildnahe Seite kann bei Fotos und Screenshots unnötige Ränder vermeiden."]]
    }
  },
  fr: {
    "topic-pdf-word-private": {
      slug: "pdf-sans-televersement-vers-word",
      title: "PDF vers Word sans téléversement | FreePDF Tools",
      description: "Comprendre comment convertir un PDF en Word localement dans le navigateur et quand utiliser l'OCR pour les scans.",
      eyebrow: "PDF vers Word · privé",
      h1: "Convertir un PDF en Word sans téléversement",
      lead: "Pour les flux pris en charge, le document sélectionné reste dans le navigateur, ce qui convient aux fichiers sensibles.",
      sections: [["Traitement local", "Le navigateur charge l'application et les bibliothèques nécessaires, puis lit le PDF et génère le DOCX sur l'appareil."],["Quand utiliser l'OCR", "Si le texte ne peut pas être sélectionné ou copié, la page est probablement une image. Activez l'OCR local pour ces pages."],["Vérifier le résultat", "Contrôlez les tableaux, chiffres, sauts de page et caractères spéciaux avant de partager le document."]]
    },
    "topic-scanned-pdf-word": {
      slug: "pdf-scane-vers-word-ocr",
      title: "PDF numérisé vers Word avec OCR | FreePDF Tools",
      description: "Convertir des PDF numérisés en texte Word modifiable avec OCR local et vérifier les erreurs courantes.",
      eyebrow: "OCR · PDF numérisé",
      h1: "Convertir un PDF numérisé en Word",
      lead: "Un PDF numérisé contient souvent des images. L'OCR reconnaît les caractères visibles pour produire du texte modifiable.",
      sections: [["Identifier un scan", "Si le texte ne peut pas être sélectionné, la page est généralement basée sur une image."],["Lancer l'OCR", "La page est rendue localement et reconnue avec l'OCR anglais. Le résultat est une reconstruction, pas une copie graphique parfaite."],["Vérifier les données sensibles", "Comparez noms, dates, numéros, tableaux et colonnes avec la source."]]
    },
    "topic-pdf-word-formatting": {
      slug: "formatage-pdf-vers-word",
      title: "PDF vers Word : limites de mise en forme | FreePDF Tools",
      description: "Pourquoi les tableaux, colonnes, images, polices et sauts de page peuvent changer lors d'une conversion PDF vers Word.",
      eyebrow: "PDF vers Word · mise en forme",
      h1: "PDF vers Word : que devient la mise en forme ?",
      lead: "Le PDF décrit une page fixe alors que Word utilise une structure éditable. La conversion est donc une reconstruction.",
      sections: [["Texte", "Le texte sélectionnable est généralement le plus simple à convertir, mais les titres et paragraphes peuvent nécessiter des ajustements."],["Tableaux et colonnes", "Des éléments positionnés peuvent ressembler à des tableaux sans contenir la même structure que Word."],["Images et polices", "Les polices indisponibles et les objets complexes peuvent être représentés différemment dans le DOCX."]]
    },
    "topic-ocr-pdf-online": {
      slug: "ocr-pdf-en-ligne",
      title: "OCR PDF en ligne : convertir un scan en texte | FreePDF Tools",
      description: "Reconnaître localement les pages PDF numérisées et produire du texte, du DOCX ou du TXT.",
      eyebrow: "OCR PDF",
      h1: "OCR PDF en ligne",
      lead: "L'OCR reconnaît les caractères visibles des pages basées sur des images et rend le contenu recherchable et modifiable.",
      sections: [["Quand utiliser l'OCR", "Utilisez-le pour les scans, captures ou pages sans couche de texte exploitable."],["Traitement local", "La page PDF est rendue dans le navigateur puis traitée par le moteur OCR auto-hébergé."],["Vérifier le résultat", "Les scans inclinés, le faible contraste, les tableaux et les caractères similaires peuvent produire des erreurs."]]
    },
    "topic-ocr-pdf-accuracy": {
      slug: "precision-ocr-pdf",
      title: "Précision OCR PDF : facteurs qui influencent le résultat | FreePDF Tools",
      description: "Comprendre l'impact de la résolution, du contraste, de l'orientation, des colonnes et des tableaux sur l'OCR PDF.",
      eyebrow: "OCR · précision",
      h1: "OCR PDF : améliorer la précision",
      lead: "La qualité du scan influence souvent autant le résultat OCR que le moteur de reconnaissance.",
      sections: [["Qualité de l'image", "Un texte net, assez grand et contrasté fournit de meilleures données à l'OCR."],["Orientation", "Les pages droites sont plus faciles à traiter que les documents inclinés ou tournés."],["Chiffres et noms", "Des caractères semblables peuvent être confondus. Vérifiez les identifiants et valeurs importantes avec l'original."]]
    },
    "topic-word-97-2003-pdf": {
      slug: "word-97-2003-vers-pdf",
      title: "Convertir Word 97–2003 DOC en PDF | FreePDF Tools",
      description: "Convertir les fichiers DOC Microsoft Word 97–2003 pris en charge en PDF dans le navigateur et vérifier la mise en page.",
      eyebrow: "DOC · Word 97–2003",
      h1: "Convertir Word 97–2003 en PDF",
      lead: "Les anciens fichiers .doc utilisent un format interne différent du DOCX moderne et nécessitent un parseur adapté.",
      sections: [["Conserver le bon format", "Renommer un fichier .doc en .docx ne convertit pas sa structure interne."],["Vérifier la mise en page", "Contrôlez les sauts de page, tableaux, polices et objets intégrés dans le PDF créé."],["Conserver l'original", "Gardez le document source lorsqu'il a une valeur d'archive ou de preuve."]]
    },
    "topic-docx-to-pdf": {
      slug: "docx-vers-pdf",
      title: "Convertir DOCX en PDF en ligne | FreePDF Tools",
      description: "Convertir les fichiers DOCX pris en charge en PDF localement et vérifier les éléments de mise en page.",
      eyebrow: "DOCX · Word vers PDF",
      h1: "Convertir DOCX en PDF",
      lead: "DOCX est le format Word moderne. Le PDF fournit une mise en page fixe facile à partager.",
      sections: [["Pourquoi le PDF", "Le PDF est pratique pour partager, imprimer et déposer un document avec une mise en page stable."],["Ce qui peut changer", "Polices, sauts de page, objets flottants et éléments complexes peuvent être rendus différemment."],["Confidentialité", "Le flux pris en charge produit le PDF localement dans le navigateur sans envoyer le document source à un serveur de conversion."]]
    },
    "topic-private-pdf": {
      slug: "convertisseur-pdf-prive",
      title: "Convertisseur PDF privé : traitement local expliqué | FreePDF Tools",
      description: "Comprendre le traitement local des PDF, les requêtes réseau nécessaires au site et les vérifications de confidentialité.",
      eyebrow: "Confidentialité · PDF",
      h1: "Convertisseur PDF privé : que signifie local ?",
      lead: "Le traitement local signifie que les octets du document sélectionné restent dans le navigateur pour le flux de conversion pris en charge.",
      sections: [["Site et document", "Le navigateur doit charger HTML, JavaScript et bibliothèques. Cela diffère de l'envoi du document sélectionné au serveur de conversion."],["Pourquoi c'est utile", "Les contrats, factures et documents personnels peuvent bénéficier de l'absence de transfert du document vers un service distant."],["Vérification", "L'inspection réseau et l'architecture publiée doivent confirmer que le contenu du document n'est pas envoyé à un serveur d'application."]]
    },
    "topic-pdf-to-text": {
      slug: "pdf-vers-texte",
      title: "PDF vers texte : extraire le texte d'un PDF | FreePDF Tools",
      description: "Comprendre l'extraction directe du texte PDF et savoir quand utiliser l'OCR à la place.",
      eyebrow: "PDF vers texte",
      h1: "PDF vers texte : extraire avant de faire l'OCR",
      lead: "Lorsqu'un PDF contient déjà une couche de texte, l'extraction directe est généralement plus simple.",
      sections: [["Texte ou scan", "Un texte sélectionnable indique qu'une extraction directe est possible. Pour une page image, l'OCR est nécessaire."],["Ordre de lecture", "Les PDF stockent des positions. Les colonnes ou encadrés peuvent donc modifier l'ordre du texte extrait."],["Limites du TXT", "Le texte brut ne conserve ni les polices, ni les images, ni les bordures exactes des tableaux."]]
    },
    "topic-compress-target": {
      slug: "compresser-pdf-taille-cible",
      title: "Compresser un PDF à une taille cible : limites | FreePDF Tools",
      description: "Pourquoi une taille PDF exacte n'est pas toujours atteignable sans perte et quels compromis la réduction d'images implique.",
      eyebrow: "Compresser PDF",
      h1: "Compresser un PDF à une taille cible",
      lead: "La compression structurelle peut réduire un PDF sans perte, mais elle ne garantit pas une taille exacte pour tous les documents.",
      sections: [["Pourquoi les résultats varient", "Les PDF riches en texte et ceux dominés par des images déjà compressées ne réagissent pas de la même façon."],["Optimisation avec perte", "Pour respecter une limite stricte, il peut être nécessaire de réduire la résolution ou la qualité des images."],["Vérifier le résultat", "Ouvrez le PDF compressé et contrôlez le nombre de pages, la lisibilité, les images et les liens."]]
    },
    "topic-jpg-mobile": {
      slug: "jpg-vers-pdf-mobile",
      title: "JPG vers PDF sur mobile | FreePDF Tools",
      description: "Transformer des photos et captures d'écran en PDF sur téléphone, organiser les pages et vérifier le résultat.",
      eyebrow: "JPG vers PDF · mobile",
      h1: "JPG vers PDF sur mobile",
      lead: "Les photos du téléphone peuvent être regroupées en PDF depuis un navigateur mobile.",
      sections: [["Choisir les images", "Sélectionnez des images nettes et vérifiez leur ordre."],["Taille des pages", "A4 ou Letter conviennent aux documents. Une page adaptée à l'image peut être utile pour des photos ou captures."],["Mémoire mobile", "Plusieurs grandes photos peuvent utiliser beaucoup de mémoire. Traiter moins de pages à la fois peut améliorer la stabilité."]]
    },
    "topic-pdf-page-size": {
      slug: "taille-page-pdf-a4-letter",
      title: "Taille de page PDF : A4, Letter ou image ? | FreePDF Tools",
      description: "Comparer A4, US Letter et les pages adaptées à l'image pour choisir une taille PDF adaptée au partage et à l'impression.",
      eyebrow: "Taille de page PDF",
      h1: "Taille de page PDF : A4, Letter ou image",
      lead: "Le choix dépend de l'impression, d'un formulaire à déposer ou d'une lecture principalement à l'écran.",
      sections: [["A4", "A4 convient à de nombreux documents de bureau et travaux d'impression en dehors des États-Unis."],["Letter", "US Letter est courant aux États-Unis et dans certains systèmes qui l'exigent."],["Taille de l'image", "Une page proche de la taille de l'image peut éviter des marges inutiles pour les photos et captures."]]
    }
  },
  es: {
    "topic-pdf-word-private": {
      slug: "pdf-a-word-sin-subir",
      title: "PDF a Word sin subir el archivo | FreePDF Tools",
      description: "Cómo convertir PDF a Word localmente en el navegador y cuándo usar OCR para páginas escaneadas.",
      eyebrow: "PDF a Word · privado",
      h1: "Convertir PDF a Word sin subir el archivo",
      lead: "En los flujos compatibles, el PDF seleccionado permanece en el navegador. Es útil para documentos sensibles.",
      sections: [["Procesamiento local", "El navegador carga la aplicación y sus bibliotecas y después lee el PDF y genera el DOCX en el dispositivo."],["Cuándo usar OCR", "Si el texto no se puede seleccionar o copiar, la página suele ser una imagen. Activa el OCR local para esas páginas."],["Revisar el resultado", "Comprueba tablas, números, saltos de página y caracteres especiales antes de compartir el documento."]]
    },
    "topic-scanned-pdf-word": {
      slug: "pdf-escaneado-a-word-ocr",
      title: "PDF escaneado a Word con OCR | FreePDF Tools",
      description: "Convertir PDF escaneados en texto Word editable con OCR local y revisar errores habituales.",
      eyebrow: "OCR · PDF escaneado",
      h1: "Convertir PDF escaneado a Word",
      lead: "Un PDF escaneado suele contener imágenes. OCR reconoce los caracteres visibles para producir texto editable.",
      sections: [["Identificar un escaneo", "Si no puedes seleccionar el texto, la página probablemente está basada en una imagen."],["Ejecutar OCR", "La página se renderiza localmente y se reconoce con OCR en inglés. El resultado es una reconstrucción, no una copia visual exacta."],["Revisar datos importantes", "Compara nombres, fechas, números, tablas y columnas con el documento original."]]
    },
    "topic-pdf-word-formatting": {
      slug: "formato-pdf-a-word",
      title: "PDF a Word: límites del formato y cambios | FreePDF Tools",
      description: "Por qué tablas, columnas, imágenes, fuentes y saltos de página pueden cambiar al convertir PDF a Word.",
      eyebrow: "PDF a Word · formato",
      h1: "PDF a Word: qué pasa con el formato",
      lead: "PDF describe una página fija mientras Word usa una estructura editable. La conversión es una reconstrucción.",
      sections: [["Texto", "El texto seleccionable suele ser lo más sencillo, pero títulos y párrafos pueden necesitar ajustes."],["Tablas y columnas", "Elementos colocados en posiciones concretas pueden parecer tablas sin tener la misma estructura que una tabla de Word."],["Imágenes y fuentes", "Fuentes no disponibles y objetos complejos pueden aparecer de forma diferente en el DOCX."]]
    },
    "topic-ocr-pdf-online": {
      slug: "ocr-pdf-online",
      title: "OCR PDF online: convertir PDF escaneado a texto | FreePDF Tools",
      description: "Reconocer localmente páginas PDF escaneadas y generar texto, DOCX o TXT.",
      eyebrow: "OCR PDF",
      h1: "OCR PDF online",
      lead: "OCR reconoce caracteres visibles de páginas basadas en imágenes y hace el contenido buscable y editable.",
      sections: [["Cuándo usar OCR", "Úsalo en escaneos, capturas o páginas sin una capa de texto útil."],["Procesamiento local", "La página PDF se renderiza en el navegador y el motor OCR autoalojado procesa la imagen localmente."],["Revisar el resultado", "Escaneos inclinados, poco contraste, tablas y caracteres similares pueden causar errores."]]
    },
    "topic-ocr-pdf-accuracy": {
      slug: "precision-ocr-pdf",
      title: "Precisión OCR PDF: factores que afectan el resultado | FreePDF Tools",
      description: "Cómo influyen la resolución, contraste, orientación, columnas y tablas en la precisión del OCR de PDF.",
      eyebrow: "OCR · precisión",
      h1: "OCR PDF: mejorar la precisión",
      lead: "La calidad del escaneo puede influir tanto en OCR como el propio motor de reconocimiento.",
      sections: [["Calidad de imagen", "Texto claro, suficientemente grande y con buen contraste ofrece mejores datos para OCR."],["Orientación", "Las páginas rectas son más fáciles de procesar que documentos girados o inclinados."],["Números y nombres", "Los caracteres parecidos pueden confundirse. Verifica identificadores y cifras importantes con el original."]]
    },
    "topic-word-97-2003-pdf": {
      slug: "word-97-2003-a-pdf",
      title: "Convertir Word 97–2003 DOC a PDF | FreePDF Tools",
      description: "Convertir archivos DOC compatibles de Microsoft Word 97–2003 a PDF en el navegador y revisar el formato.",
      eyebrow: "DOC · Word 97–2003",
      h1: "Convertir Word 97–2003 a PDF",
      lead: "Los archivos .doc antiguos usan un formato interno distinto de DOCX y necesitan un parser adecuado.",
      sections: [["Mantener el formato original", "Renombrar un archivo .doc a .docx no convierte su estructura interna."],["Revisar el diseño", "Comprueba saltos de página, tablas, fuentes y objetos incrustados en el PDF generado."],["Conservar el original", "Guarda el documento de origen cuando tenga valor de archivo o de prueba."]]
    },
    "topic-docx-to-pdf": {
      slug: "docx-a-pdf",
      title: "Convertir DOCX a PDF online | FreePDF Tools",
      description: "Convertir archivos DOCX compatibles a PDF localmente y revisar los elementos de formato importantes.",
      eyebrow: "DOCX · Word a PDF",
      h1: "Convertir DOCX a PDF",
      lead: "DOCX es el formato moderno de Word. PDF ofrece una presentación fija fácil de compartir.",
      sections: [["Por qué PDF", "PDF resulta práctico para compartir, imprimir y presentar documentos con un diseño estable."],["Qué puede cambiar", "Fuentes, saltos de página, objetos flotantes y elementos complejos pueden verse de forma diferente."],["Privacidad", "El flujo compatible genera el PDF localmente en el navegador sin enviar el documento a un servidor de conversión."]]
    },
    "topic-private-pdf": {
      slug: "convertidor-pdf-privado",
      title: "Convertidor PDF privado: procesamiento local explicado | FreePDF Tools",
      description: "Qué significa procesar PDF localmente, qué solicitudes de red siguen siendo necesarias y cómo comprobar la privacidad.",
      eyebrow: "Privacidad · PDF",
      h1: "Convertidor PDF privado: ¿qué significa local?",
      lead: "El procesamiento local significa que los bytes del documento seleccionado permanecen en el navegador durante el flujo compatible.",
      sections: [["Sitio frente a documento", "El navegador necesita descargar HTML, JavaScript y bibliotecas. Eso es distinto de subir el documento seleccionado a un servidor de conversión."],["Por qué importa", "Contratos, facturas y documentos personales pueden beneficiarse de no transferir el contenido a un servicio remoto."],["Comprobación", "La inspección de red y la arquitectura publicada deben confirmar que el contenido del documento no se envía a un servidor de aplicación."]]
    },
    "topic-pdf-to-text": {
      slug: "pdf-a-texto",
      title: "PDF a texto: extraer texto de un PDF | FreePDF Tools",
      description: "Comprender la extracción directa de texto PDF y saber cuándo es mejor utilizar OCR.",
      eyebrow: "PDF a texto",
      h1: "PDF a texto: extraer antes de usar OCR",
      lead: "Cuando el PDF ya contiene una capa de texto, la extracción directa suele ser más sencilla.",
      sections: [["Texto o escaneo", "Si el texto se puede seleccionar, la extracción directa es la opción natural. Para una página de imagen necesitas OCR."],["Orden de lectura", "PDF almacena posiciones. Columnas o recuadros pueden cambiar el orden del texto extraído."],["Límites del TXT", "El texto plano no conserva fuentes, imágenes ni los bordes exactos de las tablas."]]
    },
    "topic-compress-target": {
      slug: "comprimir-pdf-tamano-objetivo",
      title: "Comprimir PDF a un tamaño objetivo: límites | FreePDF Tools",
      description: "Por qué un tamaño exacto no siempre puede lograrse sin pérdida y qué implica reducir la calidad de las imágenes.",
      eyebrow: "Comprimir PDF",
      h1: "Comprimir PDF a un tamaño objetivo",
      lead: "La compresión estructural puede reducir un PDF sin pérdida, pero no garantiza un tamaño exacto para todos los documentos.",
      sections: [["Por qué cambia el resultado", "Los PDF con mucho texto y los que dependen de imágenes ya comprimidas responden de manera diferente."],["Optimización con pérdida", "Para un límite estricto puede ser necesario reducir resolución o calidad de imagen."],["Comprobar el resultado", "Abre el PDF comprimido y verifica páginas, legibilidad, imágenes y enlaces."]]
    },
    "topic-jpg-mobile": {
      slug: "jpg-a-pdf-en-movil",
      title: "JPG a PDF en el móvil | FreePDF Tools",
      description: "Convertir fotos y capturas en PDF desde el móvil, ordenar las páginas y revisar el resultado.",
      eyebrow: "JPG a PDF · móvil",
      h1: "JPG a PDF en el móvil",
      lead: "Las fotos del teléfono pueden reunirse en un PDF desde un navegador móvil.",
      sections: [["Elegir imágenes", "Selecciona imágenes nítidas y comprueba el orden."],["Tamaño de página", "A4 o Letter funcionan bien para documentos. Un tamaño ajustado a la imagen puede ser mejor para fotos o capturas."],["Memoria del móvil", "Varias fotos grandes pueden usar mucha memoria. Procesar menos páginas por vez puede mejorar la estabilidad."]]
    },
    "topic-pdf-page-size": {
      slug: "tamano-pagina-pdf-a4-letter",
      title: "Tamaño de página PDF: A4, Letter o imagen | FreePDF Tools",
      description: "Comparar A4, US Letter y páginas ajustadas a imágenes para elegir el tamaño PDF adecuado.",
      eyebrow: "Tamaño de página PDF",
      h1: "Tamaño de página PDF: A4, Letter o imagen",
      lead: "La elección depende de si el PDF se imprimirá, se enviará a un sistema o se verá principalmente en pantalla.",
      sections: [["A4", "A4 funciona bien para muchos documentos de oficina e impresión fuera de Estados Unidos."],["Letter", "US Letter es habitual en Estados Unidos y en sistemas que lo exigen."],["Tamaño de imagen", "Una página cercana al tamaño de la imagen puede evitar márgenes innecesarios en fotos y capturas."]]
    }
  }
};

export function getLocalizedTopic(locale, key) {
  return LOCALIZED_TOPIC_CONTENT[locale]?.[key] || null;
}

export function localizedTopicPath(locale, key) {
  const data = getLocalizedTopic(locale, key);
  if (!data) throw new Error("Missing localized topic: " + locale + "/" + key);
  return "/" + locale + "/topics/" + data.slug;
}
