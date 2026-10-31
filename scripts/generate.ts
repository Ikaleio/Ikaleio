import { api, pin, topLangs, type ApiResult } from "@stats-organization/github-readme-stats-core";
import { generateSnakeAnimation, type DrawOptions } from "generate-snake-animation";
import { banner } from "./banner";
import { theme, type Mode } from "./theme";

const username = "Ikaleio";
const token = process.env.GITHUB_TOKEN ?? "";
if (!token) throw new Error("GITHUB_TOKEN is required");

type Renderer = (query: Record<string, string>, pat: string) => Promise<ApiResult>;

// The core's JS signatures are inferred from destructuring and mark every option as required.
const renderers = { api, topLangs, pin } as unknown as Record<"api" | "topLangs" | "pin", Renderer>;

// The card renderer takes colors without the leading "#".
const bare = (color: string) => color.slice(1);

function cardColors(mode: Mode): Record<string, string> {
  const { foreground, mutedForeground, border, primary } = theme[mode];
  return {
    title_color: bare(foreground),
    text_color: bare(mutedForeground),
    icon_color: bare(mutedForeground),
    ring_color: bare(primary),
    border_color: bare(border),
  };
}

const featuredRepos = ["lm-detector", "monoize", "argon-luogu", "ikapb-oss", "transit", "patchright-cli"];

const cards: { name: string; render: Renderer; options: Record<string, string> }[] = [
  { name: "stats", render: renderers.api, options: { show_icons: "true", rank_icon: "github", custom_title: "GitHub Stats", disable_animations: "true" } },
  { name: "top-langs", render: renderers.topLangs, options: { layout: "compact", langs_count: "8", custom_title: "Top Languages", disable_animations: "true" } },
  ...featuredRepos.map((repo) => ({
    name: `pin-${repo}`,
    render: renderers.pin,
    options: { repo, description_lines_count: "2" },
  })),
];

async function renderCard(card: (typeof cards)[number], mode: Mode) {
  const query = { username, bg_color: "00000000", border_radius: "12", ...cardColors(mode), ...card.options };
  const result = await card.render(query, token);
  // The renderer returns an error card instead of throwing; fail so a broken card is never committed.
  if (result.status?.startsWith("error") || !result.content) {
    throw new Error(`${card.name}: ${result.error?.message ?? result.status}`);
  }
  await Bun.write(`assets/cards/${card.name}-${mode}.svg`, result.content);
}

function snakeDrawOptions(mode: Mode): DrawOptions {
  const { contributionEmpty, contributionLevels, foreground } = theme[mode];
  // Index 0 is the empty cell, 1-4 are contribution levels from low to high.
  const dots = [contributionEmpty, ...contributionLevels];
  return {
    // The library looks dots up by level; its branded key type does not accept a plain array.
    colorDots: dots as unknown as DrawOptions["colorDots"],
    colorEmpty: contributionEmpty,
    colorDotBorder: "transparent",
    colorSnake: foreground,
    sizeCell: 16,
    sizeDot: 12,
    sizeDotBorderRadius: 2,
  };
}

const modes: Mode[] = ["light", "dark"];

// Holds the first frame, where every cell still shows its level; `animation: none` would blank them.
const pauseWhenReducedMotion = (svg: string) =>
  svg.replace("<style>", "<style>@media (prefers-reduced-motion: reduce){*{animation-play-state:paused!important}}");

async function renderSnake() {
  const svgs = await generateSnakeAnimation(
    { platform: "github", username, githubToken: token },
    modes.map((mode) => ({
      format: "svg",
      drawOptions: snakeDrawOptions(mode),
      animationOptions: { frameByStep: 1, stepDurationMs: 100 },
    })),
  );
  await Promise.all(modes.map((mode, i) => Bun.write(`assets/snake-${mode}.svg`, pauseWhenReducedMotion(svgs[i] as string))));
}

await Promise.all([
  ...modes.map((mode) => Bun.write(`assets/banner-${mode}.svg`, banner(mode))),
  ...cards.flatMap((card) => modes.map((mode) => renderCard(card, mode))),
  renderSnake(),
]);
console.log(`Generated banners, ${cards.length * modes.length} cards and snakes`);
