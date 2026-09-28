export const LOCALES = {
  de: { lang: "de", name: "Deutsch", path: "/de/" },
  fr: { lang: "fr", name: "Français", path: "/fr/" },
  es: { lang: "es", name: "Español", path: "/es/" }
};

export const ENGLISH_PATHS = {
  home: "/",
  converter: "/pdf-converter-online",
  merge: "/tools/merge-pdf",
  split: "/tools/split-pdf",
  jpg: "/tools/jpg-to-pdf",
  pdfword: "/tools/pdf-to-word",
  wordpdf: "/tools/word-to-pdf",
  compress: "/tools/compress-pdf",
  ocr: "/tools/ocr-pdf"
};

export const PAGE_KEYS = [...Object.keys(ENGLISH_PATHS), ...LOCALIZED_TOPIC_KEYS];

const content = {
  de: {
    home: {
      title: "PDF Converter online kostenlos — PDF Tools | FreePDF Tools",
      description: "Kostenlose PDF Tools für Zusammenfügen, Teilen, Konvertieren, Komprimieren und OCR. Unterstützte Dateien werden direkt im Browser verarbeitet.",
      eyebrow: "Kostenlos · privat · ohne Upload",
      h1: "Kostenloser PDF Converter online",
      lead: "PDF-Dateien zusammenfügen, teilen, konvertieren, komprimieren und scannen — direkt im Browser. Für unterstützte Abläufe ist kein Datei-Upload an unseren Server nötig.",
      sections: [
        ["PDF-Aufgaben an einem Ort", "Nutze passende Werkzeuge zum Zusammenfügen, Teilen, Konvertieren von JPG und Word, Reduzieren der Dateigröße oder Erkennen von Text aus gescannten PDF-Dateien."],
        ["PDF privat im Browser verarbeiten", "Die unterstützten Arbeitsabläufe laufen lokal im Browser. Das kann für Verträge, Rechnungen, Bewerbungsunterlagen und andere persönliche Dokumente praktisch sein."],
        ["Für wichtige Dokumente Ergebnis prüfen", "PDF-Konvertierung und OCR sind keine Garantie für eine perfekte 1:1-Darstellung. Prüfe Seitenreihenfolge, Tabellen, Zahlen und Layout vor dem Weitergeben."]
      ],
      cta: "PDF Converter öffnen"
    },
    converter: {
      title: "Online PDF Converter kostenlos — Dateien konvertieren | FreePDF Tools",
      description: "Kostenloser Online PDF Converter für Zusammenfügen, Teilen, Bilder, Word, Komprimierung und OCR mit browserbasierter Verarbeitung.",
      eyebrow: "PDF Converter · kostenlos · browserbasiert",
      h1: "Online PDF Converter",
      lead: "Wähle die PDF-Aufgabe, die du wirklich erledigen möchtest, und starte den passenden Browser-Workflow.",
      sections: [
        ["PDF zusammenfügen oder teilen", "Kombiniere mehrere Dokumente oder extrahiere nur die Seiten, die du brauchst."],
        ["PDF und Word konvertieren", "Konvertiere Text aus PDFs nach Word oder unterstützte DOC- und DOCX-Dateien nach PDF."],
        ["PDF-Größe reduzieren", "Die verlustfreie Komprimierung kann bei strukturlastigen PDFs helfen; bildlastige Dokumente reagieren unterschiedlich."],
        ["Gescanntes PDF per OCR lesen", "OCR rendert gescannte Seiten und erkennt sichtbare Zeichen. Das Ergebnis sollte vor der Verwendung geprüft werden."]
      ],
      cta: "Zu den PDF Tools"
    },
    merge: {
      title: "PDF zusammenfügen online kostenlos | FreePDF Tools",
      description: "PDFs online kostenlos zusammenfügen, sortieren und als eine Datei speichern. Browserbasierte Verarbeitung ohne Dokument-Upload.",
      eyebrow: "PDF zusammenfügen · kombinieren",
      h1: "PDF zusammenfügen online",
      lead: "Mehrere PDF-Dateien zu einem geordneten Dokument kombinieren und die Reihenfolge der Seiten vor dem Download festlegen.",
      sections: [
        ["PDF-Dateien kombinieren", "Füge Berichte, Anhänge, Rechnungen oder andere PDFs zu einer einzigen Datei zusammen."],
        ["Seitenreihenfolge prüfen", "Ordne die Quelldateien und Seiten so, dass Deckblatt, Hauptteil und Anhänge in der richtigen Reihenfolge erscheinen."],
        ["Lokale Verarbeitung", "Das unterstützte Zusammenfügen läuft im Browser. Deine Quelldateien werden für diesen Workflow nicht an unseren Anwendungsserver hochgeladen."]
      ],
      cta: "PDF zusammenfügen starten"
    },
    split: {
      title: "PDF teilen online kostenlos — Seiten extrahieren | FreePDF Tools",
      description: "PDF online teilen, Seitenbereiche extrahieren oder einzelne Seiten erzeugen. Die unterstützte Verarbeitung läuft direkt im Browser.",
      eyebrow: "PDF teilen · Seiten extrahieren",
      h1: "PDF online teilen",
      lead: "Extrahiere einen Seitenbereich oder erstelle einzelne PDF-Seiten aus einem größeren Dokument.",
      sections: [
        ["Seitenbereich auswählen", "Erstelle eine kleinere PDF-Datei mit genau den Seiten, die du weitergeben oder separat speichern möchtest."],
        ["Einzelseiten erzeugen", "Für Aufgaben wie das Sortieren von Unterlagen können einzelne Seiten als separate PDF-Dateien erzeugt werden."],
        ["Original behalten", "Arbeite mit einer Kopie und prüfe die Ausgabe, bevor du das ursprüngliche Dokument entfernst."]
      ],
      cta: "PDF teilen starten"
    },
    jpg: {
      title: "JPG in PDF umwandeln online kostenlos | FreePDF Tools",
      description: "JPG und PNG online in PDF umwandeln. Bilder anordnen, Seitengröße wählen und das Ergebnis direkt im Browser erstellen.",
      eyebrow: "JPG zu PDF · PNG zu PDF",
      h1: "JPG in PDF umwandeln",
      lead: "Mehrere Bilder zu einer PDF-Datei machen, Reihenfolge festlegen und passende Seitengrößen für Scans, Fotos oder Screenshots wählen.",
      sections: [
        ["Bilder zu einem PDF kombinieren", "JPG- oder PNG-Dateien können als geordnete PDF-Seiten ausgegeben werden."],
        ["Seitengröße bewusst wählen", "A4 und Letter passen für viele Dokumente. Eine bildnahe Seitengröße kann bei bestimmten Fotos oder Screenshots sinnvoll sein."],
        ["Vor dem Versand prüfen", "Kontrolliere Bildreihenfolge, Orientierung und Lesbarkeit, bevor du die PDF-Datei weitergibst."]
      ],
      cta: "JPG zu PDF öffnen"
    },
    pdfword: {
      title: "PDF in Word umwandeln kostenlos — PDF zu DOCX | FreePDF Tools",
      description: "Textbasierte PDF-Dateien kostenlos in bearbeitbare Word-DOCX-Dateien umwandeln. Browserbasierte Verarbeitung ohne Upload.",
      eyebrow: "PDF zu Word · DOCX",
      h1: "PDF in Word umwandeln",
      lead: "Text aus einer textbasierten PDF-Datei in ein bearbeitbares Word-Dokument übernehmen, ohne die Quelldatei hochzuladen.",
      sections: [
        ["Am besten für textbasierte PDFs", "Wenn sich Text im PDF markieren und kopieren lässt, kann die Standardkonvertierung gut als Ausgangspunkt für Word funktionieren."],
        ["Layout kann sich ändern", "PDF ist ein festes Seitenformat. Spalten, Tabellen, Bilder, Formulare und genaue Abstände werden nicht garantiert 1:1 nachgebaut."],
        ["Gescanntes PDF?", "Für bildbasierte Scans brauchst du OCR. Nutze dafür die separate OCR-Seite für gescannte PDF-Dateien."]
      ],
      cta: "PDF zu Word öffnen"
    },
    wordpdf: {
      title: "Word in PDF umwandeln kostenlos — DOC und DOCX | FreePDF Tools",
      description: "Word-DOC- und DOCX-Dateien online kostenlos in PDF umwandeln, einschließlich unterstützter Word-97-2003-Dateien.",
      eyebrow: "Word zu PDF · DOC · DOCX",
      h1: "Word in PDF umwandeln",
      lead: "Unterstützte Word-Dateien in eine PDF-Datei umwandeln und das Ergebnis direkt im Browser erzeugen.",
      sections: [
        ["DOC und DOCX", "Der Workflow unterstützt moderne DOCX-Dateien sowie die unterstützte Verarbeitung älterer Microsoft-Word-97-2003-DOC-Dateien."],
        ["Layout vor dem Teilen prüfen", "Schriftarten, Seitenumbrüche und komplexe Word-Elemente können je nach Dokument variieren. Öffne die PDF vor dem Versand und prüfe sie."],
        ["Kein Dokument-Upload im unterstützten Workflow", "Die Verarbeitung erfolgt lokal im Browser, sodass die Quelldatei für diesen Ablauf nicht an einen Konvertierungsserver gesendet werden muss."]
      ],
      cta: "Word zu PDF öffnen"
    },
    compress: {
      title: "PDF komprimieren online kostenlos — PDF-Größe reduzieren | FreePDF Tools",
      description: "PDF-Dateien kostenlos komprimieren und die Dateigröße mit einer verlustfreien browserbasierten Verarbeitung reduzieren.",
      eyebrow: "PDF komprimieren · verlustfrei",
      h1: "PDF komprimieren online",
      lead: "Reduziere die PDF-Dateigröße mit einer verlustfreien Struktur-Komprimierung im Browser.",
      sections: [
        ["Was die Komprimierung macht", "Unterstützte PDF-Streams und Objektstrukturen werden neu komprimiert, ohne absichtlich die Bildqualität zu verschlechtern."],
        ["Warum die Einsparung variiert", "Bereits effizient komprimierte oder stark JPEG-lastige PDFs lassen sich unter Umständen nur wenig verkleinern."],
        ["Für E-Mail und Uploads", "Prüfe die neue Dateigröße vor dem Versand. Wenn ein Dokument nach der verlustfreien Verarbeitung kaum kleiner wird, ist eine stärkere Bildoptimierung ein anderer Arbeitsablauf."]
      ],
      cta: "PDF komprimieren öffnen"
    },
    ocr: {
      title: "OCR PDF online kostenlos — gescanntes PDF in Word | FreePDF Tools",
      description: "Gescanntes PDF kostenlos per OCR in erkannten Text, Word-DOCX oder TXT umwandeln. Die Verarbeitung läuft lokal im Browser.",
      eyebrow: "OCR · gescannte PDF-Dateien",
      h1: "Gescanntes PDF mit OCR umwandeln",
      lead: "Erkenne sichtbaren Text aus bildbasierten PDF-Seiten und lade das Ergebnis als bearbeitbares Word-Dokument oder Textdatei herunter.",
      sections: [
        ["Wann OCR nötig ist", "Wenn sich Text im PDF nicht markieren oder kopieren lässt, besteht die Seite oft nur aus einem Bild. OCR liest dann die sichtbaren Zeichen."],
        ["Ergebnis sorgfältig prüfen", "Schiefe Seiten, schwacher Kontrast, Tabellen, Spalten, Handschrift und ähnliche Zeichen können die Erkennung beeinflussen."],
        ["Lokale Verarbeitung", "PDF-Rendering, Texterkennung und DOCX-Erstellung laufen in deinem Browser. Das OCR-Ergebnis ist eine editierbare Rekonstruktion, keine pixelgenaue Kopie des Scans."]
      ],
      cta: "OCR PDF öffnen"
    }
  },
  fr: {
    home: {
      title: "Convertisseur PDF en ligne gratuit — Outils PDF | FreePDF Tools",
      description: "Outils PDF gratuits pour fusionner, diviser, convertir, compresser et faire de l'OCR. Les opérations prises en charge sont traitées dans le navigateur.",
      eyebrow: "Gratuit · privé · sans téléversement",
      h1: "Convertisseur PDF en ligne gratuit",
      lead: "Fusionnez, divisez, convertissez, compressez et faites l'OCR de vos PDF directement dans le navigateur. Les flux pris en charge n'ont pas besoin d'envoyer le document à notre serveur.",
      sections: [
        ["Les tâches PDF courantes au même endroit", "Choisissez un outil pour fusionner des fichiers PDF, extraire des pages, convertir des images ou des documents Word, réduire la taille ou reconnaître le texte d'un scan."],
        ["Traitement PDF dans le navigateur", "Les opérations prises en charge s'exécutent localement dans le navigateur. C'est pratique pour les contrats, factures, CV et autres documents personnels."],
        ["Vérifier le résultat", "La conversion PDF et l'OCR ne garantissent pas une reproduction parfaite de la mise en page. Vérifiez les tableaux, les chiffres, l'ordre des pages et le rendu avant le partage."]
      ],
      cta: "Ouvrir le convertisseur PDF"
    },
    converter: {
      title: "Convertisseur PDF en ligne gratuit — Outils privés | FreePDF Tools",
      description: "Convertisseur PDF gratuit pour fusionner, diviser, convertir des images et Word, compresser des PDF et faire de l'OCR dans le navigateur.",
      eyebrow: "Convertisseur PDF · gratuit · navigateur",
      h1: "Convertisseur PDF en ligne",
      lead: "Choisissez la tâche PDF dont vous avez besoin et ouvrez le flux correspondant directement depuis votre navigateur.",
      sections: [
        ["Fusionner ou diviser un PDF", "Combinez plusieurs documents ou extrayez uniquement les pages dont vous avez besoin."],
        ["Convertir PDF et Word", "Convertissez le texte d'un PDF en DOCX ou les fichiers DOC et DOCX pris en charge en PDF."],
        ["Réduire la taille d'un PDF", "La compression sans perte peut réduire certains PDF structurels; les fichiers très riches en images réagissent différemment."],
        ["OCR pour les PDF numérisés", "L'OCR transforme les pages numérisées en images puis reconnaît les caractères visibles. Vérifiez toujours le résultat."]
      ],
      cta: "Voir les outils PDF"
    },
    merge: {
      title: "Fusionner des PDF en ligne gratuitement | FreePDF Tools",
      description: "Fusionnez plusieurs fichiers PDF, réorganisez les pages et téléchargez un document unique. Traitement pris en charge directement dans le navigateur.",
      eyebrow: "Fusionner PDF · combiner PDF",
      h1: "Fusionner des PDF en ligne",
      lead: "Combinez plusieurs fichiers PDF dans un document unique et contrôlez l'ordre des pages avant le téléchargement.",
      sections: [
        ["Combiner plusieurs PDF", "Réunissez des rapports, annexes, factures et autres PDF dans un seul document."],
        ["Contrôler l'ordre", "Placez la couverture, le corps du document et les annexes dans l'ordre voulu avant de créer le fichier final."],
        ["Traitement local", "Le flux de fusion pris en charge s'exécute dans le navigateur, sans envoyer les fichiers sources à notre serveur d'application."]
      ],
      cta: "Commencer à fusionner des PDF"
    },
    split: {
      title: "Diviser un PDF en ligne gratuitement — Extraire des pages | FreePDF Tools",
      description: "Divisez un PDF en ligne, extrayez une plage de pages ou créez des PDF individuels avec un traitement dans le navigateur.",
      eyebrow: "Diviser PDF · extraire pages",
      h1: "Diviser un PDF en ligne",
      lead: "Extrayez une plage de pages ou créez des fichiers PDF séparés à partir d'un document plus volumineux.",
      sections: [
        ["Sélectionner une plage", "Créez un PDF plus petit contenant uniquement les pages que vous souhaitez partager."],
        ["Créer des pages séparées", "Produisez des PDF individuels lorsque chaque page doit être envoyée ou classée séparément."],
        ["Conserver l'original", "Gardez le fichier source jusqu'à ce que vous ayez vérifié le résultat final."]
      ],
      cta: "Commencer à diviser un PDF"
    },
    jpg: {
      title: "JPG en PDF en ligne gratuitement | FreePDF Tools",
      description: "Convertissez JPG et PNG en PDF, réorganisez les images et choisissez une taille de page directement dans le navigateur.",
      eyebrow: "JPG en PDF · PNG en PDF",
      h1: "Convertir JPG en PDF",
      lead: "Transformez plusieurs images en un seul PDF, choisissez l'ordre et adaptez la taille des pages aux scans, photos et captures d'écran.",
      sections: [
        ["Créer un PDF à partir d'images", "Les fichiers JPG et PNG peuvent être réunis sous forme de pages PDF ordonnées."],
        ["Choisir la taille de page", "A4 et Letter conviennent à de nombreux documents. Une page adaptée à l'image peut être utile pour certaines photos."],
        ["Vérifier avant l'envoi", "Contrôlez l'ordre, l'orientation et la lisibilité des images avant de partager le PDF."]
      ],
      cta: "Ouvrir JPG en PDF"
    },
    pdfword: {
      title: "Convertir PDF en Word gratuitement — PDF vers DOCX | FreePDF Tools",
      description: "Convertissez des PDF contenant du texte en documents Word DOCX modifiables, directement dans le navigateur et sans téléversement du document.",
      eyebrow: "PDF vers Word · DOCX",
      h1: "Convertir un PDF en Word",
      lead: "Transformez le texte d'un PDF textuel en document Word modifiable sans envoyer le fichier source à un serveur de conversion.",
      sections: [
        ["Idéal pour les PDF textuels", "Si vous pouvez sélectionner et copier du texte dans le PDF, la conversion standard peut constituer une bonne base pour l'édition."],
        ["La mise en page peut changer", "Le PDF est un format à mise en page fixe. Les colonnes, tableaux, images, formulaires et espacements ne sont pas recréés à l'identique."],
        ["PDF numérisé ?", "Pour un scan constitué d'images, utilisez l'outil OCR dédié pour reconnaître le texte avant de travailler dans Word."]
      ],
      cta: "Ouvrir PDF vers Word"
    },
    wordpdf: {
      title: "Convertir Word en PDF gratuitement — DOC et DOCX | FreePDF Tools",
      description: "Convertissez les fichiers Word DOC et DOCX pris en charge en PDF gratuitement, directement dans le navigateur.",
      eyebrow: "Word vers PDF · DOC · DOCX",
      h1: "Convertir Word en PDF",
      lead: "Transformez les documents Word pris en charge en fichiers PDF et générez le résultat directement dans votre navigateur.",
      sections: [
        ["DOC et DOCX", "Le flux prend en charge les documents DOCX modernes ainsi que les fichiers DOC Microsoft Word 97–2003 pris en charge."],
        ["Vérifier la mise en page", "Les polices, sauts de page et éléments Word complexes peuvent varier. Ouvrez toujours le PDF avant de le partager."],
        ["Traitement sans téléversement", "Le flux pris en charge s'exécute localement dans le navigateur afin d'éviter un envoi du document source à un service de conversion distant."]
      ],
      cta: "Ouvrir Word vers PDF"
    },
    compress: {
      title: "Compresser un PDF en ligne gratuitement — Réduire la taille | FreePDF Tools",
      description: "Compressez un PDF gratuitement avec une passe sans perte exécutée dans le navigateur et réduisez la taille de fichier lorsque la structure le permet.",
      eyebrow: "Compresser PDF · sans perte",
      h1: "Compresser un PDF en ligne",
      lead: "Réduisez la taille d'un PDF avec une compression structurelle sans perte directement dans le navigateur.",
      sections: [
        ["Ce que fait la compression", "Les flux et structures PDF pris en charge sont recompressés sans réduire volontairement la qualité des images."],
        ["Pourquoi le résultat varie", "Un PDF déjà optimisé ou principalement composé de photographies JPEG déjà compressées peut peu diminuer."],
        ["Pour les pièces jointes", "Vérifiez la nouvelle taille avant l'envoi. Une réduction d'image plus forte correspond à un autre flux, potentiellement avec perte."]
      ],
      cta: "Ouvrir le compresseur PDF"
    },
    ocr: {
      title: "OCR PDF en ligne gratuit — PDF numérisé vers Word | FreePDF Tools",
      description: "Faites l'OCR d'un PDF numérisé, obtenez du texte reconnu et téléchargez un DOCX ou TXT, directement dans le navigateur.",
      eyebrow: "OCR · PDF numérisé",
      h1: "Faire l'OCR d'un PDF numérisé",
      lead: "Reconnaissez le texte visible des pages PDF basées sur des images et téléchargez le résultat en Word modifiable ou en texte brut.",
      sections: [
        ["Quand utiliser l'OCR", "Si le texte ne peut pas être sélectionné ou copié, la page est souvent une image. L'OCR reconnaît alors les caractères visibles."],
        ["Vérifier le résultat", "Une page inclinée, un contraste faible, des tableaux, plusieurs colonnes ou des caractères similaires peuvent produire des erreurs."],
        ["Traitement local", "Le rendu PDF, la reconnaissance et la création du DOCX se font dans le navigateur. Le résultat OCR est une reconstruction modifiable, pas une copie graphique parfaite."]
      ],
      cta: "Ouvrir OCR PDF"
    }
  },
  es: {
    home: {
      title: "Convertidor PDF online gratis — Herramientas PDF | FreePDF Tools",
      description: "Herramientas PDF gratuitas para unir, dividir, convertir, comprimir y hacer OCR. Los procesos compatibles se ejecutan directamente en el navegador.",
      eyebrow: "Gratis · privado · sin subir archivos",
      h1: "Convertidor PDF online gratis",
      lead: "Une, divide, convierte, comprime y aplica OCR a tus PDF directamente en el navegador. Los flujos compatibles no necesitan enviar el documento a nuestro servidor.",
      sections: [
        ["Tareas PDF habituales en un solo lugar", "Elige herramientas para unir archivos, extraer páginas, convertir imágenes o Word, reducir el tamaño o reconocer texto de documentos escaneados."],
        ["Procesamiento PDF en el navegador", "Los procesos compatibles se ejecutan localmente en el navegador. Puede ser útil para contratos, facturas, currículums y otros documentos personales."],
        ["Revisa el resultado antes de compartir", "La conversión PDF y el OCR no garantizan una reproducción visual idéntica. Comprueba tablas, cifras, saltos de página y orden antes de usar el archivo."]
      ],
      cta: "Abrir convertidor PDF"
    },
    converter: {
      title: "Convertidor PDF online gratis — Herramientas privadas | FreePDF Tools",
      description: "Convertidor PDF gratuito para unir, dividir, convertir imágenes y Word, comprimir y aplicar OCR desde el navegador.",
      eyebrow: "Convertidor PDF · gratis · navegador",
      h1: "Convertidor PDF online",
      lead: "Elige la tarea PDF que necesitas y abre el flujo correspondiente desde tu navegador.",
      sections: [
        ["Unir o dividir un PDF", "Combina varios documentos o extrae solo las páginas que necesitas."],
        ["Convertir PDF y Word", "Convierte texto de PDF a DOCX o los archivos DOC y DOCX compatibles a PDF."],
        ["Reducir el tamaño de un PDF", "La compresión sin pérdida puede reducir algunos PDF estructurales; los documentos con muchas imágenes pueden cambiar menos."],
        ["OCR para PDF escaneado", "El OCR convierte las páginas escaneadas en imágenes y reconoce los caracteres visibles. Revisa siempre el resultado."]
      ],
      cta: "Ver herramientas PDF"
    },
    merge: {
      title: "Unir PDF online gratis — Combinar archivos PDF | FreePDF Tools",
      description: "Une varios archivos PDF, ordena las páginas y crea un solo documento con procesamiento compatible en el navegador.",
      eyebrow: "Unir PDF · combinar PDF",
      h1: "Unir PDF online",
      lead: "Combina varios archivos PDF en un documento y controla el orden de las páginas antes de descargarlo.",
      sections: [
        ["Combinar varios PDF", "Une informes, anexos, facturas y otros PDF en un único documento."],
        ["Controlar el orden", "Coloca portada, contenido y anexos en el orden correcto antes de crear el archivo final."],
        ["Procesamiento local", "El flujo compatible para unir PDF se ejecuta en el navegador y no necesita enviar los archivos originales a nuestro servidor."]
      ],
      cta: "Empezar a unir PDF"
    },
    split: {
      title: "Dividir PDF online gratis — Extraer páginas | FreePDF Tools",
      description: "Divide un PDF, extrae un rango de páginas o crea PDF individuales directamente desde el navegador.",
      eyebrow: "Dividir PDF · extraer páginas",
      h1: "Dividir PDF online",
      lead: "Extrae un rango de páginas o crea archivos PDF separados a partir de un documento más grande.",
      sections: [
        ["Elegir un rango de páginas", "Crea un PDF más pequeño con las páginas exactas que quieras compartir o guardar."],
        ["Crear páginas individuales", "Genera archivos separados cuando necesites enviar o clasificar cada página por separado."],
        ["Conservar el original", "Mantén el archivo original hasta que hayas comprobado el resultado."]
      ],
      cta: "Empezar a dividir PDF"
    },
    jpg: {
      title: "JPG a PDF online gratis — Convertir imágenes a PDF | FreePDF Tools",
      description: "Convierte JPG y PNG a PDF online gratis, ordena imágenes y elige el tamaño de página directamente en el navegador.",
      eyebrow: "JPG a PDF · PNG a PDF",
      h1: "Convertir JPG a PDF",
      lead: "Convierte varias imágenes en un solo PDF, define el orden y el tamaño de página para escaneos, fotos o capturas.",
      sections: [
        ["Crear un PDF desde imágenes", "Los archivos JPG y PNG pueden convertirse en páginas PDF ordenadas."],
        ["Elegir el tamaño de página", "A4 y Letter funcionan bien para muchos documentos. Un tamaño ajustado a la imagen puede ser mejor para algunas fotos."],
        ["Revisar antes de enviar", "Comprueba el orden, la orientación y la legibilidad de las imágenes antes de compartir el PDF."]
      ],
      cta: "Abrir JPG a PDF"
    },
    pdfword: {
      title: "Convertir PDF a Word gratis — PDF a DOCX | FreePDF Tools",
      description: "Convierte PDF de texto a documentos Word DOCX editables de forma gratuita, directamente en el navegador y sin subir el documento.",
      eyebrow: "PDF a Word · DOCX",
      h1: "Convertir PDF a Word",
      lead: "Convierte el texto de un PDF basado en texto en un documento Word editable sin enviar el archivo original a un servidor.",
      sections: [
        ["Ideal para PDF con texto", "Si puedes seleccionar y copiar el texto del PDF, la conversión normal puede ser un buen punto de partida para editarlo."],
        ["El diseño puede cambiar", "PDF es un formato de diseño fijo. Columnas, tablas, imágenes, formularios y espaciado no se reconstruyen necesariamente de forma idéntica."],
        ["¿PDF escaneado?", "Para un escaneo que contiene imágenes, usa la herramienta OCR para reconocer el texto antes de editarlo en Word."]
      ],
      cta: "Abrir PDF a Word"
    },
    wordpdf: {
      title: "Convertir Word a PDF gratis — DOC y DOCX | FreePDF Tools",
      description: "Convierte archivos Word DOC y DOCX compatibles a PDF gratis, directamente desde el navegador.",
      eyebrow: "Word a PDF · DOC · DOCX",
      h1: "Convertir Word a PDF",
      lead: "Convierte documentos Word compatibles a PDF y crea el resultado directamente en tu navegador.",
      sections: [
        ["DOC y DOCX", "El flujo admite archivos DOCX modernos y los archivos DOC compatibles de Microsoft Word 97–2003."],
        ["Revisar el diseño", "Las fuentes, los saltos de página y los elementos complejos de Word pueden variar. Abre siempre el PDF antes de compartirlo."],
        ["Procesamiento sin subir el documento", "El flujo compatible se ejecuta localmente en el navegador y evita enviar el documento fuente a un servicio remoto de conversión."]
      ],
      cta: "Abrir Word a PDF"
    },
    compress: {
      title: "Comprimir PDF online gratis — Reducir tamaño | FreePDF Tools",
      description: "Comprime PDF gratis con una pasada sin pérdida ejecutada en el navegador y reduce el tamaño cuando la estructura del documento lo permite.",
      eyebrow: "Comprimir PDF · sin pérdida",
      h1: "Comprimir PDF online",
      lead: "Reduce el tamaño de un PDF con compresión estructural sin pérdida directamente en el navegador.",
      sections: [
        ["Qué hace esta compresión", "Los flujos y estructuras PDF compatibles se recomprimen sin reducir intencionadamente la calidad de las imágenes."],
        ["Por qué el ahorro cambia", "Un PDF ya optimizado o dominado por fotografías JPEG ya comprimidas puede reducirse muy poco."],
        ["Para correo y cargas", "Comprueba el nuevo tamaño antes de enviarlo. La optimización de imágenes más intensa es un proceso diferente y puede ser con pérdida."]
      ],
      cta: "Abrir compresor PDF"
    },
    ocr: {
      title: "OCR PDF online gratis — PDF escaneado a Word | FreePDF Tools",
      description: "Haz OCR a PDF escaneados, reconoce texto y descarga Word DOCX o TXT, directamente en el navegador.",
      eyebrow: "OCR · PDF escaneado",
      h1: "Convertir PDF escaneado con OCR",
      lead: "Reconoce el texto visible de páginas PDF basadas en imágenes y descarga el resultado como Word editable o texto plano.",
      sections: [
        ["Cuándo usar OCR", "Si no puedes seleccionar ni copiar el texto, la página puede ser una imagen. OCR reconoce entonces los caracteres visibles."],
        ["Revisar el resultado", "Páginas inclinadas, poco contraste, tablas, columnas y caracteres parecidos pueden provocar errores de reconocimiento."],
        ["Procesamiento local", "El renderizado PDF, el reconocimiento y la creación de DOCX se realizan en el navegador. El resultado es una reconstrucción editable, no una copia gráfica perfecta."]
      ],
      cta: "Abrir OCR PDF"
    }
  }
};

export function getLocalizedPage(locale, key) {
  return content[locale]?.[key] || null;
}

export function localePagePath(locale, key) {
  if (LOCALIZED_TOPIC_KEYS.includes(key)) return localizedTopicPath(locale, key);
  if (key === "home") return "/" + locale + "/";
  const slug = key === "converter" ? "pdf-converter-online" :
    key === "pdfword" ? "pdf-to-word" :
    key === "wordpdf" ? "word-to-pdf" :
    key === "jpg" ? "jpg-to-pdf" :
    key === "pdf-converter-online" ? "pdf-converter-online" : key;
  return "/" + locale + "/" + slug;
}

export function englishPath(key) {
  return ENGLISH_PATHS[key] || englishTopicPath(key);
}

export function allLocalizedPaths() {
  return Object.keys(LOCALES).flatMap((locale) => PAGE_KEYS.map((key) => ({
    locale,
    key,
    path: localePagePath(locale, key)
  })));
}
