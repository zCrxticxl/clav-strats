# Clav.Strats UI contract

## Scope and reference
Preserve the existing Map Learn screenshot and `src/App.css` component patterns.
This is an incremental control addition, not a redesign or tooling migration.

## Palette
Use the existing CSS variables: `--bg-void`, `--bg-surface`, `--bg-panel`,
`--border-subtle`, `--border-mid`, `--text-primary`, `--text-secondary`.
Gold (`--accent-gold`) identifies default callouts and primary actions;
blue (`--accent-blue`) identifies the personal overlay. Errors use `--accent-red`.
Existing SVG text uses pale gold #FFF4C4 and an rgba(8,10,14,.9) outline.

## Typography
Keep Rajdhani display, Inter body, Share Tech Mono labels via existing variables.
Controls use 11–13px text. SVG callouts start at 28 viewBox units and scale to 84
(100–300%). Quiz markers retain a 52-unit base. Do not scale the map or boundaries.

## Layout and spacing
Preserve the 300px sidebar and 16px grid gap; stack below 850px.
Use 4/8/12/16px control spacing, existing 4px/8px radii, and subtle 1px borders.
The slider fits in the wrapping toolbar, with its current percentage always visible.
Custom-name editing stays in the sidebar, never floating over the map.

## Primitives and states
Native labelled range input: 100–300, step 5, gold progress, keyboard support.
Layer buttons: independent `aria-pressed` states, default gold and custom blue.
Room list buttons and SVG labels select a room. Sidebar form supports Enter to
save, explicit removal, an empty/disabled save state, and a persistent error notice.
Custom labels sit below defaults when both layers are visible, centered otherwise.

## Interaction and accessibility
No decorative animation. Immediate map feedback; visible keyboard focus outlines.
Label inputs, announce save/error status, and distinguish layers by text as well as
color. Names and percentage persist locally; blocked storage must not report success.

## Responsive behavior
Toolbar wraps. Slider is at most 260px wide and fits the container. The sidebar form
uses full-width input and wrapping actions. Preserve existing desktop navigation.

## Accepted limits
Personal names refer to existing map rooms, not free-position labels. Quiz uses
official names and hides the custom overlay. Local preferences are not cloud sync.
Dense neighboring room labels may overlap at large sizes; independent layer toggles
let users reduce clutter. Existing navigation on very narrow screens is unchanged.

## Quiz modes
Keep the map/sidebar composition. The sidebar offers Time Trial, Multiple Choice,
and Type Name as compact labelled buttons. Gold is the primary start/next action;
green marks the target and correct feedback, red identifies an incorrect answer.
Time Trial shows a 32px mono timer, room progress, and mistakes. The clock starts
only on Start run and continues through mistakes and backgrounding; aborted runs
never enter the local leaderboard. Best times are scoped to map, floor and room
count, with time, mistakes and date visible in a compact semantic table (top 10).
All rooms are visited once in shuffled order. A selected list name can be assigned
by clicking the highlighted polygon or its keyboard-accessible check button;
dragging a name onto the target is the desktop alternative. Wrong drops outside
the target do not submit. Keep a scrollable list with an explicit selected state.
Multiple Choice offers the correct official name and up to five unique distractors,
then locks answers until Next room. Type Name uses the same explicit review step.
No callout names are rendered on the map during quiz, only the question marker.
Show ready/running/review/finished states and storage errors honestly. Map/floor,
mode changes and leaving Quiz discard the current run, without changing custom names.
Use 4/8/12/16px gaps, existing panel colors/radii and 11–13px UI text. Native buttons,
visible focus, labelled input, progress element and live feedback support keyboard
access. Timer is not an aria-live region. Controls wrap below desktop width.
Below 850px, place the tutorial launcher in the page flow after the quiz content
instead of floating over its instructions. Keep its original behavior elsewhere.
