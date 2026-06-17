/**
 * Seed script for the Calisthenics Tracker.
 * Run with: `bun run db:seed`
 *
 * Seeds a curated catalogue of calisthenics exercises with their
 * progression variants, plus a couple of sample workouts so the
 * dashboard has something to show on first launch.
 */
import { db } from "../src/lib/db";

type VariantSeed = {
  name: string;
  difficultyLevel: number;
  description?: string;
  targetValue?: number;
};

type ExerciseSeed = {
  name: string;
  category: string;
  muscleGroup: string;
  isStatic: boolean;
  description?: string;
  equipment?: string;
  variants: VariantSeed[];
};

const CATALOG: ExerciseSeed[] = [
  {
    name: "Planche",
    category: "Static",
    muscleGroup: "Full body",
    isStatic: true,
    description:
      "Isometric hold with body parallel to the ground, supported only by the hands.",
    equipment: "Paralettes (optional)",
    variants: [
      { name: "Tuck Planche", difficultyLevel: 1, description: "Knees tucked to chest.", targetValue: 30 },
      { name: "Advanced Tuck Planche", difficultyLevel: 2, description: "Hips at shoulder height, back flat.", targetValue: 30 },
      { name: "Straddle Planche", difficultyLevel: 3, description: "Legs apart, straight.", targetValue: 15 },
      { name: "Full Planche", difficultyLevel: 4, description: "Legs together, fully straight.", targetValue: 10 },
    ],
  },
  {
    name: "Front Lever",
    category: "Static",
    muscleGroup: "Back / Core",
    isStatic: true,
    description: "Body held horizontally while hanging from a bar.",
    equipment: "Pull-up bar / Rings",
    variants: [
      { name: "Tuck Front Lever", difficultyLevel: 1, targetValue: 30 },
      { name: "Advanced Tuck Front Lever", difficultyLevel: 2, targetValue: 30 },
      { name: "Straddle Front Lever", difficultyLevel: 3, targetValue: 15 },
      { name: "Full Front Lever", difficultyLevel: 4, targetValue: 10 },
    ],
  },
  {
    name: "Back Lever",
    category: "Static",
    muscleGroup: "Back / Chest",
    isStatic: true,
    description: "Body held horizontally, face down, while hanging.",
    equipment: "Rings / Bar",
    variants: [
      { name: "Tuck Back Lever", difficultyLevel: 1, targetValue: 30 },
      { name: "Advanced Tuck Back Lever", difficultyLevel: 2, targetValue: 20 },
      { name: "Straddle Back Lever", difficultyLevel: 3, targetValue: 15 },
      { name: "Full Back Lever", difficultyLevel: 4, targetValue: 10 },
    ],
  },
  {
    name: "L-Sit",
    category: "Core",
    muscleGroup: "Core / Hip flexors",
    isStatic: true,
    description: "Sit with legs straight out, body supported by the hands.",
    equipment: "Floor / Paralettes",
    variants: [
      { name: "Tuck L-Sit", difficultyLevel: 1, targetValue: 30 },
      { name: "One-Leg L-Sit", difficultyLevel: 2, targetValue: 30 },
      { name: "L-Sit", difficultyLevel: 3, targetValue: 30 },
      { name: "V-Sit", difficultyLevel: 4, targetValue: 15 },
    ],
  },
  {
    name: "Handstand",
    category: "Skill",
    muscleGroup: "Shoulders / Core",
    isStatic: true,
    description: "Balance inverted on the hands.",
    equipment: "Wall (optional)",
    variants: [
      { name: "Wall Handstand", difficultyLevel: 1, targetValue: 60 },
      { name: "Chest-to-Wall Handstand", difficultyLevel: 2, targetValue: 60 },
      { name: "Freestanding Handstand", difficultyLevel: 3, targetValue: 30 },
      { name: "One-Arm Handstand", difficultyLevel: 5, targetValue: 10 },
    ],
  },
  {
    name: "Pull-up",
    category: "Pull",
    muscleGroup: "Back / Biceps",
    isStatic: false,
    description: "Pull body up until chin clears the bar.",
    equipment: "Pull-up bar / Rings",
    variants: [
      { name: "Band-Assisted Pull-up", difficultyLevel: 1, targetValue: 10 },
      { name: "Negative Pull-up", difficultyLevel: 2, targetValue: 8 },
      { name: "Pull-up", difficultyLevel: 3, targetValue: 10 },
      { name: "Wide Pull-up", difficultyLevel: 4, targetValue: 8 },
      { name: "Archer Pull-up", difficultyLevel: 5, targetValue: 6 },
      { name: "Muscle-up", difficultyLevel: 6, targetValue: 5 },
    ],
  },
  {
    name: "Push-up",
    category: "Push",
    muscleGroup: "Chest / Triceps",
    isStatic: false,
    description: "Press body up from the floor.",
    equipment: "Floor",
    variants: [
      { name: "Knee Push-up", difficultyLevel: 1, targetValue: 20 },
      { name: "Push-up", difficultyLevel: 2, targetValue: 25 },
      { name: "Diamond Push-up", difficultyLevel: 3, targetValue: 15 },
      { name: "Archer Push-up", difficultyLevel: 4, targetValue: 10 },
      { name: "One-Arm Push-up", difficultyLevel: 5, targetValue: 8 },
    ],
  },
  {
    name: "Dip",
    category: "Push",
    muscleGroup: "Chest / Triceps",
    isStatic: false,
    description: "Lower and press between two bars or on rings.",
    equipment: "Parallel bars / Rings",
    variants: [
      { name: "Bench Dip", difficultyLevel: 1, targetValue: 15 },
      { name: "Parallel Bar Dip", difficultyLevel: 2, targetValue: 12 },
      { name: "Ring Dip", difficultyLevel: 3, targetValue: 10 },
      { name: "Weighted Dip", difficultyLevel: 4, targetValue: 10 },
    ],
  },
  {
    name: "Pistol Squat",
    category: "Legs",
    muscleGroup: "Quads / Glutes",
    isStatic: false,
    description: "Single-leg squat to full depth.",
    variants: [
      { name: "Assisted Pistol Squat", difficultyLevel: 1, targetValue: 8 },
      { name: "Box Pistol Squat", difficultyLevel: 2, targetValue: 8 },
      { name: "Pistol Squat", difficultyLevel: 3, targetValue: 8 },
      { name: "Weighted Pistol Squat", difficultyLevel: 4, targetValue: 6 },
    ],
  },
  {
    name: "Handstand Push-up",
    category: "Push",
    muscleGroup: "Shoulders",
    isStatic: false,
    description: "Press upside down against gravity.",
    equipment: "Wall / Paralettes",
    variants: [
      { name: "Pike Push-up", difficultyLevel: 1, targetValue: 10 },
      { name: "Wall HSPU (Partial)", difficultyLevel: 2, targetValue: 8 },
      { name: "Wall HSPU (Full)", difficultyLevel: 3, targetValue: 6 },
      { name: "Freestanding HSPU", difficultyLevel: 5, targetValue: 4 },
    ],
  },
  {
    name: "Dragon Flag",
    category: "Core",
    muscleGroup: "Core",
    isStatic: false,
    description: "Body held straight while pivoting from the shoulders.",
    equipment: "Bench",
    variants: [
      { name: "Tuck Dragon Flag", difficultyLevel: 1, targetValue: 8 },
      { name: "Straddle Dragon Flag", difficultyLevel: 2, targetValue: 8 },
      { name: "Dragon Flag", difficultyLevel: 3, targetValue: 8 },
    ],
  },
  {
    name: "Human Flag",
    category: "Static",
    muscleGroup: "Side core / Shoulders",
    isStatic: true,
    description: "Hold body horizontal gripping a vertical pole.",
    equipment: "Vertical pole",
    variants: [
      { name: "Tuck Human Flag", difficultyLevel: 1, targetValue: 10 },
      { name: "Straddle Human Flag", difficultyLevel: 2, targetValue: 8 },
      { name: "Full Human Flag", difficultyLevel: 3, targetValue: 5 },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding calisthenics catalogue...");

  // Wipe existing data so the seed is idempotent.
  await db.workoutSet.deleteMany();
  await db.workoutEntry.deleteMany();
  await db.workout.deleteMany();
  await db.exerciseVariant.deleteMany();
  await db.exercise.deleteMany();

  const exerciseIdMap = new Map<string, string>();

  for (const ex of CATALOG) {
    const created = await db.exercise.create({
      data: {
        name: ex.name,
        category: ex.category,
        muscleGroup: ex.muscleGroup,
        isStatic: ex.isStatic,
        description: ex.description,
        equipment: ex.equipment,
        variants: {
          create: ex.variants.map((v) => ({
            name: v.name,
            difficultyLevel: v.difficultyLevel,
            description: v.description,
            targetValue: v.targetValue,
          })),
        },
      },
      include: { variants: true },
    });
    exerciseIdMap.set(ex.name, created.id);
    console.log(`  ✓ ${ex.name} (${ex.variants.length} variants)`);
  }

  // Sample workouts spread over the last 3 weeks for a realistic dashboard.
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const sampleWorkouts = [
    { offset: 20, title: "Push & Static focus", entries: [
      { ex: "Planche", variant: "Tuck Planche", sets: [{ holdSeconds: 20, rpe: 7 }, { holdSeconds: 18, rpe: 8 }, { holdSeconds: 15, rpe: 8 }] },
      { ex: "Push-up", variant: "Push-up", sets: [{ reps: 20 }, { reps: 18 }, { reps: 15, rpe: 8 }] },
      { ex: "Dip", variant: "Parallel Bar Dip", sets: [{ reps: 12 }, { reps: 10 }, { reps: 8, rpe: 9 }] },
    ]},
    { offset: 17, title: "Pull day", entries: [
      { ex: "Pull-up", variant: "Pull-up", sets: [{ reps: 10 }, { reps: 8 }, { reps: 6, weightKg: 5 }] },
      { ex: "Front Lever", variant: "Tuck Front Lever", sets: [{ holdSeconds: 20, rpe: 7 }, { holdSeconds: 15, rpe: 8 }] },
    ]},
    { offset: 13, title: "Planche progression", entries: [
      { ex: "Planche", variant: "Tuck Planche", sets: [{ holdSeconds: 25, rpe: 7 }, { holdSeconds: 22, rpe: 8 }] },
      { ex: "Planche", variant: "Advanced Tuck Planche", sets: [{ holdSeconds: 10, rpe: 9 }] },
      { ex: "Handstand", variant: "Chest-to-Wall Handstand", sets: [{ holdSeconds: 45, rpe: 6 }, { holdSeconds: 50, rpe: 7 }] },
    ]},
    { offset: 10, title: "Legs & core", entries: [
      { ex: "Pistol Squat", variant: "Pistol Squat", sets: [{ reps: 6 }, { reps: 5 }, { reps: 4, rpe: 9 }] },
      { ex: "Dragon Flag", variant: "Tuck Dragon Flag", sets: [{ reps: 8 }, { reps: 6, rpe: 8 }] },
      { ex: "L-Sit", variant: "Tuck L-Sit", sets: [{ holdSeconds: 25, rpe: 7 }, { holdSeconds: 20, rpe: 8 }] },
    ]},
    { offset: 6, title: "Pull & back lever", entries: [
      { ex: "Pull-up", variant: "Pull-up", sets: [{ reps: 11 }, { reps: 9, weightKg: 5 }, { reps: 7, weightKg: 7.5, rpe: 9 }] },
      { ex: "Back Lever", variant: "Tuck Back Lever", sets: [{ holdSeconds: 18, rpe: 7 }, { holdSeconds: 15, rpe: 8 }] },
    ]},
    { offset: 3, title: "Planche hold PR attempt", entries: [
      { ex: "Planche", variant: "Tuck Planche", sets: [{ holdSeconds: 28, rpe: 7 }, { holdSeconds: 25, rpe: 8 }, { holdSeconds: 22, rpe: 9 }] },
      { ex: "Planche", variant: "Advanced Tuck Planche", sets: [{ holdSeconds: 12, rpe: 9 }, { holdSeconds: 10, rpe: 9 }] },
      { ex: "Push-up", variant: "Archer Push-up", sets: [{ reps: 8 }, { reps: 7, rpe: 8 }] },
    ]},
    { offset: 0, title: "Today - Skill session", entries: [
      { ex: "Handstand", variant: "Chest-to-Wall Handstand", sets: [{ holdSeconds: 60, rpe: 5 }, { holdSeconds: 60, rpe: 6 }] },
      { ex: "Handstand", variant: "Freestanding Handstand", sets: [{ holdSeconds: 8, rpe: 8 }, { holdSeconds: 6, rpe: 8 }] },
      { ex: "L-Sit", variant: "L-Sit", sets: [{ holdSeconds: 18, rpe: 8 }, { holdSeconds: 15, rpe: 9 }] },
    ]},
  ];

  for (const w of sampleWorkouts) {
    const date = new Date(now.getTime() - w.offset * day);
    const workout = await db.workout.create({
      data: {
        date,
        title: w.title,
        durationMin: 45 + Math.floor(Math.random() * 30),
        perceivedExertion: 6 + Math.floor(Math.random() * 4),
        bodyweightKg: 72,
        notes: "",
      },
    });
    for (const e of w.entries) {
      const exerciseId = exerciseIdMap.get(e.ex)!;
      const variant = await db.exerciseVariant.findFirst({
        where: { exerciseId, name: e.variant },
      });
      const entry = await db.workoutEntry.create({
        data: { workoutId: workout.id, exerciseId, variantId: variant?.id },
      });
      await db.workoutSet.createMany({
        data: e.sets.map((s, i) => ({
          workoutEntryId: entry.id,
          setNumber: i + 1,
          reps: (s as { reps?: number }).reps,
          holdSeconds: (s as { holdSeconds?: number }).holdSeconds,
          weightKg: (s as { weightKg?: number }).weightKg,
          rpe: (s as { rpe?: number }).rpe,
        })),
      });
    }
    console.log(`  ✓ Workout "${w.title}" (${w.entries.length} entries)`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
