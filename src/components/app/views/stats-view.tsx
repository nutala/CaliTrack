"use client";

import * as React from "react";
import {
  Flame,
  Trophy,
  CalendarDays,
  Target,
  BarChart3,
  Award,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

import {
  CATEGORY_META,
  type ExerciseCategory,
  type OverviewStats,
  type TopExercise,
} from "@/lib/types";
import {
  fmtCompact,
  fmtDate,
  relativeFromNow,
  metricUnit,
  difficultyStars,
} from "@/lib/calc";
import { useOverview, useTopExercises, useWorkouts } from "@/hooks/use-data";
import {
  StatCard,
  StatCardSkeleton,
  SectionHeading,
  EmptyState,
} from "@/components/app/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

/* ---------- chart configs ---------- */
const volumeChartConfig: ChartConfig = {
  volume: { label: "Volume", color: "var(--chart-1)" },
};

const donutChartConfig: ChartConfig = {
  sessions: { label: "Sessions" },
};

const frequencyChartConfig: ChartConfig = {
  count: { label: "Workouts", color: "var(--chart-1)" },
};

const trendChartConfig: ChartConfig = {
  volume: { label: "Volume", color: "var(--chart-2)" },
};

/* ---------- helpers ---------- */
function safeNum(v: unknown): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? n : 0;
}

function heatColor(volume: number, maxVol: number): string {
  if (volume <= 0) return "bg-muted/40";
  const ratio = maxVol > 0 ? volume / maxVol : 0;
  if (ratio < 0.34) return "bg-emerald-500/40";
  if (ratio < 0.67) return "bg-emerald-500/70";
  return "bg-emerald-500";
}

function hexWithAlpha(hex: string, alpha: number): string {
  // hex like #rrggbb -> rgba string with given alpha (0-1)
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/* ---------- main component ---------- */
export function StatsView() {
  const overviewQ = useOverview();
  const topQ = useTopExercises();
  const workoutsQ = useWorkouts();

  const overview = overviewQ.data;
  const overviewLoading = overviewQ.isLoading;

  /* 2 + 3: volume by category (with sessions) */
  const volumeByCat = React.useMemo(() => {
    if (!overview) return [];
    return overview.volumeByCategory.map((c) => {
      const cat = c.category as ExerciseCategory;
      const meta = CATEGORY_META[cat];
      return {
        category: c.category,
        label: meta?.label ?? c.category,
        volume: c.volume,
        sessions: c.sessions,
        color: meta?.color ?? "var(--chart-1)",
      };
    });
  }, [overview]);

  const totalSessions = React.useMemo(
    () => volumeByCat.reduce((acc, c) => acc + c.sessions, 0),
    [volumeByCat],
  );

  /* 4: frequency data */
  const frequencyData = React.useMemo(() => {
    if (!overview) return [];
    return overview.activityCalendar.map((d) => ({
      date: d.date,
      label: fmtDate(d.date, "dd MMM"),
      count: d.count,
      volume: d.volume,
    }));
  }, [overview]);

  /* 5: heatmap max */
  const heatmapMax = React.useMemo(
    () =>
      overview?.activityCalendar.reduce((m, d) => Math.max(m, d.volume), 0) ??
      0,
    [overview],
  );

  /* 7: per-workout volume trend (oldest → newest) */
  const trendData = React.useMemo(() => {
    if (!workoutsQ.data) return [];
    return workoutsQ.data
      .map((w) => {
        const vol = w.entries.reduce(
          (a, e) =>
            a +
            e.sets.reduce(
              (s, set) => s + (set.reps ?? set.holdSeconds ?? 0),
              0,
            ),
          0,
        );
        return {
          date: fmtDate(w.date, "dd MMM"),
          volume: vol,
        };
      })
      .reverse(); // API returns newest-first → flip to oldest-first
  }, [workoutsQ.data]);

  /* 6: personal records (sorted by bestValue desc) */
  const topExercises = React.useMemo<TopExercise[]>(() => {
    if (!topQ.data) return [];
    return [...topQ.data].sort((a, b) => b.bestValue - a.bestValue);
  }, [topQ.data]);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Analytics"
        subtitle="Deep-dive into your training volume, consistency and personal records."
      />

      {/* 1. Consistency header strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {overviewLoading || !overview ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Current Streak"
              value={overview.currentStreakDays}
              unit="days"
              icon={Flame}
              accent="success"
              hint="Consecutive training days"
            />
            <StatCard
              label="Longest Streak"
              value={overview.longestStreakDays}
              unit="days"
              icon={Trophy}
              hint="Personal best"
            />
            <StatCard
              label="This Week"
              value={overview.thisWeekCount}
              unit="sessions"
              icon={CalendarDays}
              hint="Last 7 days"
            />
            <StatCard
              label="Avg Exertion"
              value={overview.avgExertion ?? "—"}
              unit={overview.avgExertion != null ? "/10" : undefined}
              icon={Target}
              accent="warning"
              hint="Perceived effort"
            />
          </>
        )}
      </div>

      {/* Charts grid (2 columns on lg) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2. Volume by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Volume by Category
            </CardTitle>
            <CardDescription>
              Total training volume · last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading || !overview ? (
              <Skeleton className="h-[260px] w-full" />
            ) : volumeByCat.length === 0 ? (
              <EmptyState
                title="No volume data"
                description="Log workouts in the last 30 days to populate this chart."
              />
            ) : (
              <ChartContainer
                config={volumeChartConfig}
                className="h-[260px] w-full"
              >
                <BarChart
                  data={volumeByCat}
                  margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tickFormatter={(v) => fmtCompact(Number(v))}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                              {String(name)}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {fmtCompact(safeNum(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                    {volumeByCat.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 3. Category Distribution donut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Category Distribution
            </CardTitle>
            <CardDescription>
              Sessions per category · last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading || !overview ? (
              <Skeleton className="h-[260px] w-full" />
            ) : volumeByCat.length === 0 ? (
              <EmptyState
                title="No data"
                description="No recent workouts to break down."
              />
            ) : (
              <div className="relative h-[260px] w-full">
                <ChartContainer
                  config={donutChartConfig}
                  className="h-full w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) => {
                            const n = safeNum(value);
                            return (
                              <div className="flex w-full items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                  {String(name)}
                                </span>
                                <span className="font-mono font-medium tabular-nums">
                                  {n} session{n === 1 ? "" : "s"}
                                </span>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Pie
                      data={volumeByCat}
                      dataKey="sessions"
                      nameKey="label"
                      innerRadius="62%"
                      outerRadius="88%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {volumeByCat.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {totalSessions}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    sessions
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Workout Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Workout Frequency
            </CardTitle>
            <CardDescription>
              Daily workout count · last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading || !overview ? (
              <Skeleton className="h-[260px] w-full" />
            ) : frequencyData.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <ChartContainer
                config={frequencyChartConfig}
                className="h-[260px] w-full"
              >
                <BarChart
                  data={frequencyData}
                  margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, _name, item) => {
                          const n = safeNum(value);
                          return (
                            <div className="flex w-full items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                {String(
                                  (item?.payload as { label?: string } | undefined)
                                    ?.label ?? "",
                                )}
                              </span>
                              <span className="font-mono font-medium tabular-nums">
                                {n} workout{n === 1 ? "" : "s"}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 5. Activity Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              Activity Heatmap
            </CardTitle>
            <CardDescription>
              Training volume intensity · last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading || !overview ? (
              <Skeleton className="h-[200px] w-full" />
            ) : overview.activityCalendar.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <Heatmap data={overview} maxVol={heatmapMax} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Personal Records */}
      <div>
        <SectionHeading
          title="Personal Records"
          subtitle="Top exercises ranked by best single-set performance."
          action={
            topExercises.length > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {topExercises.length} exercises
              </Badge>
            ) : undefined
          }
        />
        <Card>
          <CardContent className="p-0">
            {topQ.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topExercises.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No PRs yet"
                description="Log workouts with sets to populate your personal records."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exercise</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Best Set</TableHead>
                      <TableHead>Top Variant</TableHead>
                      <TableHead className="text-right">
                        Last Performed
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topExercises.map((ex) => {
                      const cat = ex.category as ExerciseCategory;
                      const meta = CATEGORY_META[cat];
                      const color = meta?.color ?? "var(--chart-1)";
                      const isHex = color.startsWith("#");
                      const bgTint = isHex
                        ? hexWithAlpha(color, 0.12)
                        : `${color}1f`;
                      const borderColor = isHex
                        ? hexWithAlpha(color, 0.4)
                        : `${color}55`;
                      return (
                        <TableRow key={ex.exerciseId}>
                          <TableCell className="font-medium">
                            <span
                              className="block border-l-2 pl-3"
                              style={{ borderColor: color }}
                            >
                              {ex.exerciseName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="gap-1.5"
                              style={{
                                backgroundColor: bgTint,
                                borderColor,
                                color,
                              }}
                            >
                              {meta?.emoji ? <span>{meta.emoji}</span> : null}
                              {meta?.label ?? ex.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {ex.sessions}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono font-semibold tabular-nums">
                              {fmtCompact(ex.bestValue)}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              {metricUnit(ex.isStatic)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {ex.topVariantName ? (
                              <div className="flex flex-col gap-0.5 leading-tight">
                                <span className="text-xs text-amber-500">
                                  {difficultyStars(3)}
                                </span>
                                <span className="text-sm">
                                  {ex.topVariantName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {relativeFromNow(ex.lastPerformed)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. Volume Trend */}
      {trendData.length > 0 && (
        <div>
          <SectionHeading
            title="Volume Trend"
            subtitle="Total volume per workout over time."
          />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Per-workout Volume
              </CardTitle>
              <CardDescription>
                Sum of reps / hold seconds across all sets in each workout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={trendChartConfig}
                className="h-[240px] w-full"
              >
                <LineChart
                  data={trendData}
                  margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tickFormatter={(v) => fmtCompact(Number(v))}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, _name, item) => (
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                              {String(
                                (item?.payload as { date?: string } | undefined)
                                  ?.date ?? "",
                              )}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {fmtCompact(safeNum(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="var(--color-volume)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------- Heatmap sub-component ---------- */
function Heatmap({
  data,
  maxVol,
}: {
  data: OverviewStats;
  maxVol: number;
}) {
  // 30 days rendered as a 6 × 5 grid (oldest top-left → newest bottom-right).
  const cells = data.activityCalendar;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[300px] grid-cols-6 gap-1.5">
          {cells.map((d) => {
            const vol = d.volume;
            const cls = heatColor(vol, maxVol);
            const dateLabel = fmtDate(d.date, "dd MMM yyyy");
            return (
              <div
                key={d.date}
                title={`${dateLabel} · ${fmtCompact(vol)} volume · ${d.count} workout${d.count === 1 ? "" : "s"}`}
                className={`h-9 w-full rounded-[5px] transition-shadow hover:ring-2 hover:ring-ring/40 ${cls}`}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[3px] bg-muted/40" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-500/40" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-500/70" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}
