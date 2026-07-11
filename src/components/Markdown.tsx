import { Fragment } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/theme";
import { fonts, spacing, radius, type } from "../theme/tokens";

/**
 * Compact Markdown renderer for tutor replies — enough for IAL answers:
 * headings, paragraphs, bullet/numbered lists, fenced + inline code, **bold**,
 * *italic*. Styled in the editorial voice (PP Editorial New), bubble-less.
 */

type Seg = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

/** Inline parse: **bold**, *italic*, `code`. Left-to-right, non-nesting (good enough). */
function inline(src: string): Seg[] {
  const out: Seg[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    if (m[2] != null) out.push({ text: m[2], bold: true });
    else if (m[3] != null) out.push({ text: m[3], italic: true });
    else if (m[4] != null) out.push({ text: m[4], code: true });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out.length ? out : [{ text: src }];
}

export function Markdown({ content, color }: { content: string; color?: string }) {
  const { colors } = useTheme();
  const ink = color ?? colors.text;
  const lines = content.replace(/\r/g, "").split("\n");

  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const Inline = ({ src, base }: { src: string; base: object }) => (
    <Text style={[base, { color: ink }]}>
      {inline(src).map((s, j) => (
        <Text
          key={j}
          style={
            s.code
              ? { fontFamily: fonts.mono, fontSize: 13.5, backgroundColor: colors.raised }
              : s.bold
                ? { fontFamily: fonts.display }
                : s.italic
                  ? { fontFamily: fonts.lightItalic }
                  : undefined
          }
        >
          {s.text}
        </Text>
      ))}
    </Text>
  );

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim() === "") { i++; continue; }

    // fenced code block
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) buf.push(lines[i++]!);
      i++; // closing fence
      blocks.push(
        <View key={key++} style={{ backgroundColor: colors.raised, borderRadius: radius.sm, padding: spacing.md, marginVertical: spacing.sm }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 13.5, color: ink }}>{buf.join("\n")}</Text>
        </View>
      );
      continue;
    }

    // heading
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const lvl = h[1]!.length;
      const style = lvl === 1 ? type.title : type.headline;
      blocks.push(<Inline key={key++} src={h[2]!} base={{ ...style, marginTop: spacing.md, marginBottom: spacing.xs }} />);
      i++;
      continue;
    }

    // list (bullet or numbered) — consume consecutive items
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items: { marker: string; text: string }[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]!)) {
        const mm = lines[i]!.match(/^\s*([-*]|\d+\.)\s+(.*)$/)!;
        items.push({ marker: /\d/.test(mm[1]!) ? mm[1]! : "•", text: mm[2]! });
        i++;
      }
      blocks.push(
        <View key={key++} style={{ gap: 4, marginVertical: spacing.xs }}>
          {items.map((it, j) => (
            <View key={j} style={{ flexDirection: "row", gap: spacing.sm }}>
              <Text style={[type.body, { color: colors.textDim }]}>{it.marker}</Text>
              <View style={{ flex: 1 }}><Inline src={it.text} base={type.body} /></View>
            </View>
          ))}
        </View>
      );
      continue;
    }

    // paragraph — gather until blank line
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i]!.trim() !== "" && !/^\s*([-*]|\d+\.|#{1,3}\s|```)/.test(lines[i]!)) {
      para.push(lines[i++]!);
    }
    blocks.push(<Inline key={key++} src={para.join(" ")} base={{ ...type.body, marginVertical: spacing.xs }} />);
  }

  return <Fragment>{blocks}</Fragment>;
}
