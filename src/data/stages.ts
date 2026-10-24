export interface Stage {
  id: string;
  label: string;
  /** Set to 'ja' when the label is Japanese so assistive tech and fonts pick the right voice. */
  labelLang?: 'ja';
  title: string;
  blurb: string;
  /** Only open stages have a destination; everything else is locked. */
  href?: string;
}

export const stages: readonly [Stage, ...Stage[]] = [
  {
    id: 'japan',
    label: '東京',
    labelLang: 'ja',
    title: 'JAPAN',
    blurb: 'Neon alleys, night trains, and arcades. Field notes coming soon.',
  },
  {
    id: 'cyberpunk',
    label: '電脳',
    labelLang: 'ja',
    title: 'CYBERPUNK',
    blurb: 'Rain, chrome, and glowing signs. Loading…',
  },
  {
    id: 'ai',
    label: 'AI',
    title: 'AI',
    blurb: 'Machines that learn. Experiments and notes in progress.',
  },
  {
    id: 'code',
    label: 'CODE',
    title: 'CODE',
    blurb: 'Builds, tools, and engineering notes live at brandonhimes.com.',
    href: 'https://brandonhimes.com',
  },
  {
    id: 'music',
    label: '音楽',
    labelLang: 'ja',
    title: 'MUSIC',
    blurb: 'Heavy, dreamy, and electronic. Playlists coming soon.',
  },
  {
    id: 'guitar',
    label: 'ギター',
    labelLang: 'ja',
    title: 'GUITAR',
    blurb: 'Six strings, seven strings, and a lot of tone. Rig notes coming soon.',
  },
];
