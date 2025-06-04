/-
  A Lean-4 formalisation of

      P₍X,C₎( Δ(X,C) ≤ L diam(U(X)) ) ≥ 1 − α
      assuming  P₍X,C₎( C ∈ U(X) ) ≥ 1 − α
      and   f(w,·)  is  L-Lipschitz  for every w.
-/

import Mathlib.Tactic
import Mathlib.Topology.MetricSpace.Basic
import Mathlib.Analysis.NormedSpace.Lipschitz
import Mathlib.Topology.MetricSpace.Bounded
import Mathlib.MeasureTheory.Measure.Probability

open scoped Topology
open Metric MeasureTheory

/-! ### Set-up -/

variables {X C W : Type*}  -- base spaces
variables [MetricSpace C] [ProperSpace C]  -- a proper metric space for diameters

/-- The uncertainty set `U : X → set C`. -/
variable (U : X → Set C)

/--  A *deterministic* regret functional

        Δ(x,c) = min_w max_{ĉ∈U x} f w ĉ  −  min_w f w c.
-/
def Δ (f : W → C → ℝ) (x : X) (c : C) : ℝ :=
  (inf (Set.image (fun w : W =>
      sup (Set.image (fun ĉ : C => f w ĉ) (U x))) Set.univ))
    -
  (inf (Set.image (fun w : W => f w c) Set.univ))

/-! ### 1. Point-wise bound  -------------------------------------------------- -/

/--
`f` is `L`-Lipschitz in its *second* argument, uniformly in `w`.
-/
def LipschitzInSecond {L : ℝ} (f : W → C → ℝ) : Prop :=
  ∀ w : W, LipschitzWith L (fun c : C => f w c)

/--  The deterministic inequality

        Δ(x,c) ≤ L · diam (U x)     whenever   c ∈ U x.
-/
lemma Delta_le_L_diam
    {f : W → C → ℝ} {L : ℝ} (hL : LipschitzInSecond (U := U) f (L := L))
    {x : X} {c : C} (hc : c ∈ U x) :
    Δ U f x c ≤ L * Metric.diam (U x) := by
  -- Each line in the paper proof becomes a `calc` step.
  -- You can discharge the four `sorry`s with `Inf_le`, `le_Sup_of_le`,
  -- `LipschitzWith.bound` and the definition of `Metric.diam`.
  calc
    Δ U f x c
        = inf (Set.image (fun w : W =>
            sup (Set.image (fun ĉ : C => f w ĉ) (U x))) Set.univ)
          - inf (Set.image (fun w : W => f w c) Set.univ) := rfl
    _ ≤
        sup (Set.image
              (fun ĉ : C =>
                abs (sup (Set.image (fun w : W => f w ĉ) Set.univ)
                     - sup (Set.image (fun w : W => f w c) Set.univ))) (U x)) := by
      -- squeeze the two mins/maxes into a single absolute difference
      sorry
    _ ≤
        sup (Set.image
              (fun ĉ : C => L * dist ĉ c) (U x)) := by
      -- apply Lipschitz bound |f w ĉ − f w c| ≤ L · dist ĉ c for each w,
      -- then move inf/sup out with elementary order lemmas
      sorry
    _ ≤ L * Metric.diam (U x) := by
      -- `Metric.diam` is the supremum of `dist`
      sorry

/-! ### 2. Probability lift  ------------------------------------------------- -/

variables {μ : Measure (X × C)} {α L : ℝ}

lemma prob_delta_bound
    {f : W → C → ℝ}
    (hL   : LipschitzInSecond (U := U) f (L := L))
    (hCU  : μ {p : X × C | p.snd ∈ U p.fst} ≥ 1 - α) :
    μ {p : X × C | Δ U f p.fst p.snd ≤ L * Metric.diam (U p.fst)} ≥ 1 - α := by
  -- **event inclusion**:  {C ∈ U(X)}  ⊆  {Δ ≤ L diam}
  have h_subset :
      {p : X × C | p.snd ∈ U p.fst}
        ⊆ {p : X × C | Δ U f p.fst p.snd ≤ L * Metric.diam (U p.fst)} := by
    intro p hp; exact Delta_le_L_diam U hL hp
  -- **monotonicity** of the measure yields the result
  have : μ {p | Δ U f p.fst p.snd ≤ L * Metric.diam (U p.fst)}
        ≥ μ {p | p.snd ∈ U p.fst} :=
    measure_mono h_subset
  exact (le_trans this hCU)
