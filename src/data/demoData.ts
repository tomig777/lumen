import type { AppState, ImageAsset, Note } from '../types'

const image = (
  id: string,
  title: string,
  palette: [string, string, string],
  height: ImageAsset['height'],
  tags: string[] = [],
): ImageAsset => ({
  id,
  title,
  palette,
  height,
  tags,
  projectIds: [],
  collectionIds: [],
  origin: 'inspiration',
  createdAt: '2026-08-25',
})

const graphNoteThemes = [
  'Attention', 'Objects', 'Rituals', 'Interfaces', 'Rooms', 'Movement',
  'Memory', 'Questions', 'Light', 'Sound', 'Materials', 'Patterns',
]

const graphNoteAngles = [
  'morning', 'practice', 'details', 'friction', 'rhythm', 'contrast',
  'language', 'structure', 'possibility',
]

const graphNoteSentences = [
  'A small observation worth keeping close.',
  'There is a useful connection here that may become clearer later.',
  'Return to this when the surrounding idea has had time to settle.',
  'The detail matters because it changes how the whole system feels.',
]

const createGraphDemoNotes = (): Note[] => {
  const count = graphNoteThemes.length * graphNoteAngles.length * 4
  return Array.from({ length: count }, (_, index) => {
    const id = `graph-note-${index + 1}`
    const body = Array.from({ length: 1 + (index % graphNoteSentences.length) }, (__, sentenceIndex) => graphNoteSentences[(index + sentenceIndex) % graphNoteSentences.length]).join(' ')
    const relatedNoteIds = [`graph-note-${((index + 7) % count) + 1}`]
    relatedNoteIds.push(`graph-note-${index % 12 + 1}`)
    for (const offset of [12, 24, 36, 48, 60, 72]) relatedNoteIds.push(`graph-note-${(index + offset) % count + 1}`)
    if (index % 4 === 0) relatedNoteIds.push(`graph-note-${((index + 19) % count) + 1}`)
    if (index % 12 === 0) relatedNoteIds.push(`note-${(index % 18) + 1}`)

    return {
      id,
      title: `${graphNoteThemes[index % graphNoteThemes.length]} · ${graphNoteAngles[Math.floor(index / graphNoteThemes.length) % graphNoteAngles.length]}${index >= 108 ? ` / ${Math.floor(index / 108) + 1}` : ''}`,
      body,
      tags: [graphNoteThemes[index % graphNoteThemes.length].toLowerCase(), graphNoteAngles[Math.floor(index / graphNoteThemes.length) % graphNoteAngles.length]],
      relatedNoteIds,
      pinned: false,
    }
  })
}

export const createDemoState = (): AppState => ({
  version: 6,
  treeGrowth: 86,
  tasks: [
    { id: 'task-1', title: 'Evening skincare', completed: false, priority: 'medium', recurrence: 'daily', dueDate: '2026-08-25', completedOn: [] },
    { id: 'task-2', title: 'Work on Personal OS', completed: false, projectId: 'project-os', priority: 'high', recurrence: 'weekdays', dueDate: '2026-08-25', completedOn: [] },
    { id: 'task-3', title: 'Workout', completed: false, priority: 'high' },
    { id: 'task-4', title: 'Reply to Bence', completed: true, priority: 'low', dueDate: '2026-08-25', completedOn: [{ date: '2026-08-25', at: '2026-08-25T12:00:00.000Z' }] },
    { id: 'task-5', title: 'Review portfolio references', completed: false, projectId: 'project-portfolio', priority: 'medium' },
    { id: 'task-6', title: 'Read 10 pages', completed: false, priority: 'low', recurrence: 'daily', dueDate: '2026-08-25', completedOn: [] },
    { id: 'task-7', title: 'Design Brain Map', completed: false, projectId: 'project-os', priority: 'high' },
    { id: 'task-8', title: 'Buy cat food', completed: false, priority: 'medium' },
    { id: 'task-9', title: 'Order hinge samples', completed: false, projectId: 'project-airpods', priority: 'medium' },
  ],
  habits: [
    { id: 'habit-1', title: 'Morning skincare', completed: true, growth: 5 },
    { id: 'habit-2', title: 'Evening skincare', completed: false, growth: 5 },
    { id: 'habit-3', title: 'Workout', completed: false, growth: 15 },
    { id: 'habit-4', title: 'Walk', completed: false, growth: 5 },
    { id: 'habit-5', title: 'Read', completed: true, growth: 10 },
    { id: 'habit-6', title: 'Daily planning', completed: true, growth: 5 },
  ],
  thoughts: [
    { id: 'thought-1', text: 'Look into that photography idea', createdAt: 'Today · 09:42', pinned: true },
    { id: 'thought-2', text: 'Maybe redesign portfolio intro', createdAt: 'Today · 08:16', projectId: 'project-portfolio', pinned: false },
    { id: 'thought-3', text: 'Buy cat food', createdAt: 'Yesterday · 19:04', pinned: false },
    { id: 'thought-4', text: 'The home screen should only show what matters now.', createdAt: 'Aug 23 · 17:20', projectId: 'project-os', pinned: false },
  ],
  notes: [
    { id: 'note-1', title: 'Personal OS', body: 'Capture first. Organize later. Make the important feel close.', projectId: 'project-os', tags: ['system', 'principles'], relatedNoteIds: ['note-2', 'note-5'], pinned: true },
    { id: 'note-2', title: 'Portfolio Ideas', body: 'A quieter intro, editorial typography, work shown in context.', projectId: 'project-portfolio', tags: ['design'], relatedNoteIds: ['note-1', 'note-5'], pinned: false },
    { id: 'note-3', title: 'Travel', body: 'Japan in autumn. Small towns, good coffee, a few days in Tokyo.', tags: ['life'], relatedNoteIds: ['note-4'], pinned: false },
    { id: 'note-4', title: 'Movies', body: 'Keep a list of films that leave a little residue.', tags: ['references'], relatedNoteIds: ['note-3'], pinned: false },
    { id: 'note-5', title: 'Design References', body: 'Warm white, charcoal, thin rules, soft movement, a little play.', projectId: 'project-os', tags: ['visual language'], relatedNoteIds: ['note-1', 'note-2'], pinned: true },
    { id: 'note-6', title: 'Morning Pages', body: 'Write before deciding what is useful. Leave a few lines for whatever is still forming.', tags: ['system', 'reflection'], relatedNoteIds: ['note-1', 'note-7', 'note-12'], pinned: false },
    { id: 'note-7', title: 'Reading Queue', body: 'Books and essays worth returning to when there is enough attention.', tags: ['library'], relatedNoteIds: ['note-6', 'note-8', 'note-4'], pinned: false },
    { id: 'note-8', title: 'Home Atmosphere', body: 'Low light, open surfaces, linen, quiet speakers and one good chair near the window.', tags: ['life', 'design'], relatedNoteIds: ['note-7', 'note-9', 'note-5'], pinned: false },
    { id: 'note-9', title: 'Photography Notes', body: 'Late afternoon light, ordinary gestures, slightly imperfect framing and more patience before taking the picture.', projectId: 'project-portfolio', tags: ['photography', 'design'], relatedNoteIds: ['note-8', 'note-10', 'note-2'], pinned: false },
    { id: 'note-10', title: 'Recipes Worth Keeping', body: 'Simple meals that are easy enough for weekdays and good enough to make for friends.', tags: ['life'], relatedNoteIds: ['note-9', 'note-11', 'note-3'], pinned: false },
    { id: 'note-11', title: 'Places Nearby', body: 'Small cafés, long walking routes, the quiet park after rain.', tags: ['life', 'travel'], relatedNoteIds: ['note-10', 'note-12', 'note-3'], pinned: false },
    { id: 'note-12', title: 'Small Experiments', body: 'Try one interaction at a time. Keep what feels inevitable and remove whatever needs explaining.', projectId: 'project-os', tags: ['system', 'practice'], relatedNoteIds: ['note-11', 'note-13', 'note-1', 'note-6'], pinned: false },
    { id: 'note-13', title: 'Product Details', body: 'Weight, edge softness, hinge resistance, the sound of something closing and the pause before feedback appears.', projectId: 'project-os', tags: ['design', 'objects'], relatedNoteIds: ['note-12', 'note-14', 'note-5'], pinned: false },
    { id: 'note-14', title: 'Music Fragments', body: 'Songs for slow mornings, focused afternoons and walking home after dark.', tags: ['library', 'music'], relatedNoteIds: ['note-13', 'note-15', 'note-4'], pinned: false },
    { id: 'note-15', title: 'People to Call', body: 'A gentle list of people I want to stay close to without turning friendship into another inbox.', tags: ['life', 'people'], relatedNoteIds: ['note-14', 'note-16', 'note-3'], pinned: false },
    { id: 'note-16', title: 'Things I Learned', body: 'Good systems should make returning easier. Momentum is often more useful than intensity.', projectId: 'project-os', tags: ['system', 'learning'], relatedNoteIds: ['note-15', 'note-17', 'note-1'], pinned: false },
    { id: 'note-17', title: 'Future Projects', body: 'A reading room, a smaller camera archive, a tactile timer and a personal map of recurring ideas.', projectId: 'project-portfolio', tags: ['design', 'projects'], relatedNoteIds: ['note-16', 'note-18', 'note-2'], pinned: false },
    { id: 'note-18', title: 'Questions to Return To', body: 'What deserves to stay visible? What can disappear until it becomes useful again? How should a digital space feel when nothing is urgent?', projectId: 'project-os', tags: ['system', 'questions'], relatedNoteIds: ['note-17', 'note-6', 'note-1'], pinned: false },
    ...createGraphDemoNotes(),
  ],
  brainCategories: [
    { id: 'brain-category-systems', name: 'Systems', color: '#c9b6f4', icon: 'sparkles', noteIds: ['note-1', 'note-6', 'note-12', 'note-16', 'note-18'] },
    { id: 'brain-category-design', name: 'Design', color: '#efb18f', icon: 'image', noteIds: ['note-2', 'note-5', 'note-8', 'note-9', 'note-13', 'note-17'] },
    { id: 'brain-category-life', name: 'Life', color: '#a8d4c9', icon: 'compass', noteIds: ['note-3', 'note-10', 'note-11', 'note-15'] },
    { id: 'brain-category-library', name: 'Library', color: '#d9c58f', icon: 'book', noteIds: ['note-4', 'note-7', 'note-14'] },
  ],
  projects: [
    { id: 'project-os', title: 'Personal OS', status: 'Active', progress: 34, description: 'An external brain for the things that matter.', color: '#c4a9ff', nextTaskIds: ['task-2', 'task-7'], noteIds: ['note-1', 'note-5'], imageIds: ['image-1', 'image-4'], activity: ['Brain Map sketched', 'Home priorities refined', 'Captured 4 new thoughts'] },
    { id: 'project-portfolio', title: 'Portfolio Website', status: 'Active', progress: 72, description: 'A small, considered home for selected work.', color: '#f0b78e', nextTaskIds: ['task-5'], noteIds: ['note-2'], imageIds: ['image-2', 'image-5'], activity: ['Selected intro direction', 'Added 3 reference images'] },
    { id: 'project-airpods', title: 'AirPods Case', status: 'Paused', progress: 51, description: 'A tactile case study in small objects.', color: '#9ecfca', nextTaskIds: ['task-9'], noteIds: [], imageIds: ['image-3'], activity: ['Ordered hinge samples'] },
  ],
  people: [
    { id: 'person-anna', name: 'Anna', initials: 'A', color: '#e4a7a1', size: 'medium', birthday: 'May 14', likes: ['Tulips', 'Matcha', 'Arctic Monkeys'], dislikes: ['Olives'], remember: ['Wants to visit Japan', 'Thesis presentation in October'], gifts: ['Vinyl', 'Perfume'], notes: 'Always has a new restaurant recommendation.' },
    { id: 'person-bence', name: 'Bence', initials: 'B', color: '#a9c2df', size: 'small', birthday: 'November 2', likes: ['Cycling', 'Espresso'], dislikes: ['Crowds'], remember: ['Moving apartments in September'], gifts: ['Good coffee beans'], notes: '' },
    { id: 'person-david', name: 'David', initials: 'D', color: '#b2c69d', size: 'large', birthday: 'January 28', likes: ['Film cameras', 'Jazz'], dislikes: ['Sweet drinks'], remember: ['Wants to shoot on the coast'], gifts: ['35mm film'], notes: 'Met through the old studio.' },
    { id: 'person-petra', name: 'Petra', initials: 'P', color: '#d6b4d9', size: 'medium', birthday: 'June 8', likes: ['Ceramics', 'Natural wine'], dislikes: ['Early mornings'], remember: ['Her exhibition opens in October'], gifts: ['Handmade mug'], notes: '' },
    { id: 'person-mom', name: 'Mom', initials: 'M', color: '#e0c38e', size: 'large', birthday: 'March 21', likes: ['Gardens', 'Mystery novels'], dislikes: ['Cold weather'], remember: ['Call on Sunday'], gifts: ['Garden gloves'], notes: 'Ask about the roses.' },
    { id: 'person-alex', name: 'Alex', initials: 'A', color: '#a8c6c2', size: 'small', birthday: 'December 16', likes: ['Climbing', 'Ramen'], dislikes: ['Black licorice'], remember: ['Training for a half marathon'], gifts: ['Climbing chalk'], notes: '' },
  ],
  journalEntries: [
    { id: 'journal-1', date: 'August 25', title: 'A good kind of quiet', mode: 'daily', mood: 4, howWasToday: 'A little full, but in a good way.', whatHappened: 'Built out the first pass of Personal OS.', whatWasGood: 'The tree finally feels like it belongs here.', onMind: 'Keep the home screen quiet.' },
    { id: 'journal-2', date: 'August 23', title: 'The shape of things', mode: 'free', mood: 3, howWasToday: '', whatHappened: 'Some thoughts about memory and interfaces.', whatWasGood: '', onMind: 'Could a tool feel like a room?' },
  ],
  healthEntries: [
    { id: 'health-1', date: 'August 25', energy: 4, sleep: '7h 12m', workout: 'Upper Body', notes: 'Felt good today. Shoulders are a little tight.' },
  ],
  exercises: [
    { id: 'exercise-shoulder', name: 'Dumbbell shoulder press', workoutGuideId: 'exercise-seated-dumbbell-press', sets: 3, reps: 10, equipment: 'Dumbbell', description: 'Keep elbows slightly forward. Control the movement.', visual: 'shoulder' },
    { id: 'exercise-row', name: 'Single arm row', workoutGuideId: 'exercise-one-arm-dumbbell-row', sets: 3, reps: 10, equipment: 'Dumbbell', description: 'Pull toward your hip and keep your spine long.', visual: 'row' },
    { id: 'exercise-plank', name: 'Plank', workoutGuideId: 'exercise-plank', sets: 3, reps: 30, equipment: 'Bodyweight', description: 'Breathe slowly. Keep your ribs tucked and gaze soft.', visual: 'plank' },
  ],
  workouts: [
    { id: 'workout-upper', name: 'Upper Body', exerciseIds: ['exercise-shoulder', 'exercise-row', 'exercise-plank'], completedSets: {} },
  ],
  healthPlans: [
    {
      id: 'plan-2026-08-24',
      date: '2026-08-24',
      title: 'Upper body',
      focus: 'Strength',
      warmupMinutes: 10,
      exercises: [
        { id: 'planned-shoulder-0824', exerciseId: 'exercise-shoulder', sets: 3, reps: 10, unit: 'reps', phase: 'main' },
        { id: 'planned-row-0824', exerciseId: 'exercise-row', sets: 3, reps: 10, unit: 'reps', phase: 'main' },
      ],
      notes: 'Keep the first set easy and let the movement settle in.',
    },
    {
      id: 'plan-2026-08-25',
      date: '2026-08-25',
      title: 'Upper body',
      focus: 'Strength',
      warmupMinutes: 10,
      exercises: [
        { id: 'planned-shoulder-0825', exerciseId: 'exercise-shoulder', sets: 3, reps: 10, unit: 'reps', phase: 'main' },
        { id: 'planned-row-0825', exerciseId: 'exercise-row', sets: 3, reps: 10, unit: 'reps', phase: 'main' },
        { id: 'planned-plank-0825', exerciseId: 'exercise-plank', sets: 3, reps: 30, unit: 'seconds', phase: 'cooldown' },
      ],
      notes: 'Shoulders and back, finished with a steady core hold.',
    },
    {
      id: 'plan-2026-08-26',
      date: '2026-08-26',
      title: 'Recovery',
      focus: 'Mobility',
      warmupMinutes: 8,
      exercises: [],
      notes: 'A slower day still counts.',
    },
    {
      id: 'plan-2026-08-27',
      date: '2026-08-27',
      title: 'Pull + core',
      focus: 'Strength',
      warmupMinutes: 10,
      exercises: [
        { id: 'planned-row-0827', exerciseId: 'exercise-row', sets: 4, reps: 8, unit: 'reps', phase: 'main' },
        { id: 'planned-plank-0827', exerciseId: 'exercise-plank', sets: 3, reps: 35, unit: 'seconds', phase: 'main' },
      ],
      notes: '',
    },
    {
      id: 'plan-2026-08-28',
      date: '2026-08-28',
      title: 'Conditioning',
      focus: 'Build capacity',
      warmupMinutes: 12,
      exercises: [
        { id: 'planned-shoulder-0828', exerciseId: 'exercise-shoulder', sets: 3, reps: 12, unit: 'reps', phase: 'main' },
        { id: 'planned-plank-0828', exerciseId: 'exercise-plank', sets: 4, reps: 25, unit: 'seconds', phase: 'main' },
      ],
      notes: '',
    },
    { id: 'plan-2026-08-29', date: '2026-08-29', title: 'Rest day', focus: 'Recovery', warmupMinutes: 0, exercises: [], notes: '' },
    { id: 'plan-2026-08-30', date: '2026-08-30', title: 'Reset', focus: 'Mobility', warmupMinutes: 10, exercises: [], notes: 'Plan the next week while the body resets.' },
  ],
  wellnessLogs: [
    { id: 'wellness-2026-08-24', date: '2026-08-24', water: 6, meals: 3, waterDl: 15, mealKcal: 1950, skincare: true, skincareMorning: true, skincareNight: true },
    { id: 'wellness-2026-08-25', date: '2026-08-25', water: 4, meals: 2, waterDl: 10, mealKcal: 1300, skincare: true, skincareMorning: true, skincareNight: true, notes: 'Remember a little more water after training.' },
  ],
  skincareRoutine: {
    morning: ['Gentle cleanser', 'Vitamin C serum', 'Moisturizer', 'SPF 50'],
    night: ['Oil cleanser', 'Retinol serum', 'Barrier cream'],
  },
  skinPhotos: [],
  focusSessions: [
    { id: 'focus-1', mode: '25 / 5', minutes: 25, completedAt: '2026-08-24', projectId: 'project-os' },
  ],
  imageAssets: [
    image('image-1', 'Soft geometry', ['#d8c9ed', '#8e78ad', '#2e3348'], 'tall', ['interfaces', 'shapes']),
    image('image-2', 'Quiet room', ['#edd9c6', '#a96f4d', '#37332f'], 'medium', ['architecture']),
    image('image-3', 'Object study', ['#d8e8df', '#6d9d90', '#263d3c'], 'short', ['product design']),
    image('image-4', 'Night notes', ['#b9c9df', '#56668e', '#1c2133'], 'medium', ['typography']),
    image('image-5', 'Material / light', ['#f1c8b8', '#c47762', '#442d36'], 'tall', ['photography']),
    image('image-6', 'Green signal', ['#cbd7ad', '#73926d', '#273c34'], 'short', ['interfaces']),
    image('image-7', 'After rain', ['#c9d6dd', '#7997a3', '#2f4045'], 'medium', ['photography']),
    image('image-8', 'Blue hour', ['#b0b8d7', '#5a618d', '#25283f'], 'short', ['lighting']),
  ],
  collections: [
    { id: 'collection-lighting', name: 'Lighting', imageIds: ['image-5', 'image-8'], accent: '#f0b78e' },
    { id: 'collection-interfaces', name: 'Interfaces', imageIds: ['image-1', 'image-6'], accent: '#c4a9ff' },
    { id: 'collection-typography', name: 'Typography', imageIds: ['image-4'], accent: '#9ecfca' },
    { id: 'collection-photography', name: 'Photography', imageIds: ['image-2', 'image-5', 'image-7'], accent: '#d6b4d9' },
    { id: 'collection-architecture', name: 'Architecture', imageIds: ['image-2'], accent: '#e0c38e' },
    { id: 'collection-fashion', name: 'Fashion', imageIds: [], accent: '#e4a7a1' },
    { id: 'collection-3d', name: '3D', imageIds: ['image-3'], accent: '#a8c6c2' },
    { id: 'collection-product', name: 'Product Design', imageIds: ['image-3'], accent: '#b2c69d' },
  ],
  tracks: [
    { id: 'track-pink-white', title: 'Pink + White', artist: 'Frank Ocean', accent: ['#efb39e', '#7d5f86'] },
    { id: 'track-sundress', title: 'Sundress', artist: 'A$AP Rocky', accent: ['#dbd09c', '#809071'] },
    { id: 'track-line', title: 'The Line', artist: 'Loyle Carner', accent: ['#aebdd2', '#5d708d'] },
  ],
  currentTrackIndex: 0,
  isPlaying: false,
})

export const createPinterestSample = (): ImageAsset =>
  image(`image-pinterest-${Date.now()}`, 'Saved from Pinterest', ['#e5b0b1', '#9f5b78', '#33243b'], 'tall', ['saved', 'pinterest'])
