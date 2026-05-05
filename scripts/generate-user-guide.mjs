// Génère le guide utilisateur V1 au format Word (.docx).
//
// Pour chaque page du site, le guide contient :
//   - le titre + chemin
//   - la capture d'écran (depuis feedback/screenshots/)
//   - "Pour qui" / "À quoi ça sert"
//   - "Avant de commencer"
//   - "Comment faire, étape par étape"
//   - "Cas particuliers"
//   - "Bon à savoir"
//   - "À la fin"
//
// Les captures sont produites au préalable par scripts/generate-feedback-pdf.mjs
// (script REX). Si elles n'existent pas, on les régénère automatiquement.
//
// Utilisation : npm run feedback:guide

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  ShadingType,
  TableOfContents,
  StyleLevel,
} from "docx";
import { imageSize as sizeOf } from "image-size";

import { PAGES } from "./feedback-pages.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "feedback");
const SHOTS_DIR = path.join(OUT_DIR, "screenshots");
const DOCX_PATH = path.join(OUT_DIR, "guide_utilisateur_V1.docx");

const log = (msg) => console.log(`[guide-utilisateur] ${msg}`);

// Couleurs (hex sans #) — alignées avec la charte du PDF.
const COLORS = {
  primary: "4338CA",
  primaryLight: "E0E7FF",
  text: "1F2937",
  muted: "6B7280",
  border: "E5E7EB",
  ruleBg: "FEFCE8",
  ruleBorder: "EAB308",
  postBg: "ECFDF5",
  postBorder: "10B981",
  sectionBg: "F9FAFB",
};

// Largeur cible des images dans le document : Word A4 portrait avec marges
// 2,5 cm laisse environ 16 cm utiles → 600 px en EMU à 96 dpi.
const TARGET_IMAGE_WIDTH_PX = 600;

function shotPath(def) {
  const filename =
    (def.path === "/" ? "index" : def.path.replace(/^\//, "").replace(/\//g, "_")) +
    ".png";
  return path.join(SHOTS_DIR, filename);
}

async function ensureScreenshots() {
  const allExist = PAGES.every((p) => existsSync(shotPath(p)));
  if (allExist) {
    log("Captures déjà disponibles, aucune régénération.");
    return;
  }
  log("Captures manquantes — exécution préalable du générateur REX…");
  await new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/generate-feedback-pdf.mjs"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`scripts/generate-feedback-pdf.mjs a échoué (code ${code})`))
    );
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    ...opts,
    children: [new TextRun({ text, ...(opts.run ?? {}) })],
  });
}

function bulletPara(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text })],
  });
}

function numberedPara(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "guide-numbered", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text })],
  });
}

function ruleListPara(text) {
  // Puce avec léger background ambre pour signaler une règle métier.
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
    border: {
      left: { color: COLORS.ruleBorder, style: BorderStyle.SINGLE, size: 18, space: 6 },
    },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.ruleBg },
    children: [new TextRun({ text })],
  });
}

function calloutPara(text, fill, border) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    indent: { left: 240 },
    border: {
      left: { color: border, style: BorderStyle.SINGLE, size: 24, space: 8 },
    },
    shading: { type: ShadingType.CLEAR, color: "auto", fill },
    children: [new TextRun({ text })],
  });
}

// Encadré "Pour qui · À quoi ça sert" sur deux colonnes.
function actorObjectiveTable(spec) {
  const cell = (label, value) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.sectionBg },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
        left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
        right: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border },
      },
      children: [
        new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({
              text: label,
              bold: true,
              size: 18,
              color: COLORS.muted,
              allCaps: true,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: value, size: 22 })],
        }),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell("Pour qui ?", spec.acteur),
          cell("À quoi ça sert ?", spec.objectif),
        ],
      }),
    ],
  });
}

async function imageRunForScreenshot(file) {
  const buffer = await readFile(file);
  // Détermine les dimensions natives pour calculer un ratio cohérent.
  const dims = sizeOf(buffer);
  const ratio = dims.height / dims.width;
  const widthPx = TARGET_IMAGE_WIDTH_PX;
  const heightPx = Math.round(widthPx * ratio);
  return new ImageRun({
    data: buffer,
    transformation: { width: widthPx, height: heightPx },
  });
}

async function buildPageSection(def, index) {
  const children = [];

  // En-tête : numéro · titre · chemin
  if (index > 0) {
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: `${index + 1}. ${def.title}`, bold: true }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: `${def.section}  ·  `,
          size: 18,
          color: COLORS.muted,
        }),
        new TextRun({
          text: def.path,
          size: 18,
          font: "Consolas",
          color: COLORS.primary,
        }),
      ],
    })
  );

  // Description courte (une ligne)
  children.push(
    new Paragraph({
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: def.description, italics: true, size: 20 }),
      ],
    })
  );

  // Capture d'écran
  const file = shotPath(def);
  if (existsSync(file)) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [await imageRunForScreenshot(file)],
      })
    );
  } else {
    children.push(
      para(
        `(capture indisponible pour ${def.path} — relancer npm run feedback:rex)`,
        { run: { italics: true, color: COLORS.muted } }
      )
    );
  }

  if (def.spec) {
    const s = def.spec;

    children.push(actorObjectiveTable(s));

    children.push(heading("Avant de commencer", HeadingLevel.HEADING_2));
    for (const item of s.preconditions) children.push(bulletPara(item));

    children.push(
      heading("Comment faire, étape par étape", HeadingLevel.HEADING_2)
    );
    for (const step of s.parcoursNominal) children.push(numberedPara(step));

    children.push(heading("Cas particuliers", HeadingLevel.HEADING_2));
    for (const item of s.parcoursAlternatifs) children.push(bulletPara(item));

    children.push(heading("Bon à savoir", HeadingLevel.HEADING_2));
    for (const rule of s.regles) children.push(ruleListPara(rule));

    children.push(heading("À la fin", HeadingLevel.HEADING_2));
    children.push(
      calloutPara(s.postconditions, COLORS.postBg, COLORS.postBorder)
    );
  }

  return children;
}

function buildCoverChildren() {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000, after: 200 },
      children: [
        new TextRun({
          text: "COCOONING CLUB",
          bold: true,
          size: 32,
          color: COLORS.muted,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: "Guide utilisateur — V1", bold: true, size: 56 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600 },
      children: [
        new TextRun({
          text:
            "Mode d'emploi des écrans du site : pour chaque page, qui s'en sert, à quoi ça sert, comment faire, et les règles à connaître.",
          size: 24,
          color: COLORS.text,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({
          text: `Document généré le ${today}`,
          size: 20,
          color: COLORS.muted,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),

    // Table des matières automatique
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Sommaire", bold: true })],
      spacing: { before: 240, after: 240 },
    }),
    new TableOfContents("Sommaire", {
      hyperlink: true,
      headingStyleRange: "1-2",
      stylesWithLevels: [
        new StyleLevel("Heading1", 1),
        new StyleLevel("Heading2", 2),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

async function buildDocx() {
  const cover = buildCoverChildren();
  const pageBlocks = [];
  for (let i = 0; i < PAGES.length; i++) {
    const block = await buildPageSection(PAGES[i], i);
    pageBlocks.push(...block);
  }

  return new Document({
    creator: "Cocooning Club",
    title: "Guide utilisateur — V1",
    description: "Manuel d'utilisation des écrans du site Cocooning Club.",
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, color: COLORS.text },
          paragraph: {
            spacing: { before: 360, after: 120 },
            border: {
              bottom: {
                color: COLORS.primary,
                style: BorderStyle.SINGLE,
                size: 8,
                space: 4,
              },
            },
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, color: COLORS.primary, allCaps: true },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "guide-numbered",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [...cover, ...pageBlocks],
      },
    ],
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await ensureScreenshots();
  log("Construction du document Word…");
  const doc = await buildDocx();
  const buffer = await Packer.toBuffer(doc);
  await writeFile(DOCX_PATH, buffer);
  const { size } = await stat(DOCX_PATH);
  log(`Guide généré : ${DOCX_PATH} (${(size / 1024 / 1024).toFixed(2)} Mo)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
