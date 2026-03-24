/**
 * @fileoverview Onboarding wizard — shown once after registration.
 * Collects 4 pieces of financial profile data:
 *   1. Primary financial goal
 *   2. Approximate monthly income range  (+ live 50/30/20 preview)
 *   3. Spending categories to prioritise
 *   4. Budget plan summary — shows computed budgets; user can accept or skip
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import AuthBackground from "../components/AuthBackground";
import GradientButton from "../components/GradientButton";
import { useBudget } from "../context/BudgetContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useTheme } from "../context/ThemeContext";
import { CATEGORIES } from "../utils/categoryUtils";



const GOALS = [
{ key: "savings", icon: "wallet-outline", color: "#10B981" },
{ key: "expense_control", icon: "bar-chart-outline", color: "#6366F1" },
{ key: "investment", icon: "trending-up-outline", color: "#F59E0B" },
{ key: "debt_freedom", icon: "shield-checkmark-outline", color: "#EF4444" }];


const INCOME_RANGES = [
{ key: "under_1500", label: "< 1 500 RON", midpoint: 1200 },
{ key: "1500_3000", label: "1 500 – 3 000 RON", midpoint: 2250 },
{ key: "3000_6000", label: "3 000 – 6 000 RON", midpoint: 4500 },
{ key: "over_6000", label: "> 6 000 RON", midpoint: 8000 }];


const PRIORITY_CATEGORIES = [
{ key: "food", icon: "restaurant", color: "#F59E0B" },
{ key: "transport", icon: "car", color: "#3B82F6" },
{ key: "shopping", icon: "bag-handle", color: "#EC4899" },
{ key: "utilities", icon: "flash", color: "#8B5CF6" },
{ key: "housing", icon: "home", color: "#14B8A6" },
{ key: "entertainment", icon: "game-controller", color: "#F97316" },
{ key: "health", icon: "medkit", color: "#EF4444" },
{ key: "other", icon: "ellipsis-horizontal", color: "#6B7280" }];


const ALLOWED_GOALS = new Set(GOALS.map((g) => g.key));
const ALLOWED_INCOME_RANGES = new Set(INCOME_RANGES.map((r) => r.key));
const ALLOWED_PRIORITY_CATEGORIES = new Set(PRIORITY_CATEGORIES.map((c) => c.key));

function sanitizeOnboardingPayload(goal, incomeRange, priorityCategories) {
  if (!ALLOWED_GOALS.has(goal) || !ALLOWED_INCOME_RANGES.has(incomeRange)) {
    return null;
  }

  const normalizedCategories = Array.from(
    new Set(
      (priorityCategories || []).filter((key) =>
      ALLOWED_PRIORITY_CATEGORIES.has(key)
      )
    )
  );

  if (normalizedCategories.length === 0) {
    return null;
  }

  return {
    goal,
    incomeRange,
    priorityCategories: normalizedCategories
  };
}


function OptionCard({ label, sublabel, icon, color, selected, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        backgroundColor: selected ? `${color}18` : c.card,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: selected ? color : c.border,
        padding: 16,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center"
      }}>
      
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: `${color}18`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14
        }}>
        
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.foreground, fontWeight: "600", fontSize: 15 }}>
          {label}
        </Text>
        {sublabel ?
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
            {sublabel}
          </Text> :
        null}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={color} />}
    </Pressable>);

}


function CategoryChip({ label, icon, color, selected, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        backgroundColor: selected ? `${color}18` : c.card,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: selected ? color : c.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        margin: 4,
        minWidth: "44%",
        flex: 1
      }}>
      
      <Ionicons
        name={icon}
        size={16}
        color={color}
        style={{ marginRight: 6 }} />
      
      <Text
        style={{
          color: selected ? color : c.textMuted,
          fontSize: 13,
          fontWeight: selected ? "600" : "400",
          flex: 1
        }}>
        
        {label}
      </Text>
      {selected && <Ionicons name="checkmark" size={14} color={color} />}
    </Pressable>);

}


function ProgressDots({ current, total, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 32
      }}>
      
      {Array.from({ length: total }).map((_, i) =>
      <View
        key={i}
        style={{
          width: i === current ? 24 : 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: i <= current ? "#10B981" : c.border
        }} />

      )}
    </View>);

}

function StepHint({ text, c }) {
  return (
    <View
      style={{
        backgroundColor: `${"#10B981"}12`,
        borderWidth: 1,
        borderColor: `${"#10B981"}30`,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center"
      }}>
      
      <Ionicons
        name="information-circle-outline"
        size={16}
        color="#10B981"
        style={{ marginRight: 8 }} />
      
      <Text style={{ color: c.textMuted, fontSize: 12, flex: 1 }}>{text}</Text>
    </View>);

}


function IncomePreviewCard({ incomeRange, c, t }) {
  const range = INCOME_RANGES.find((r) => r.key === incomeRange);
  if (!range) return null;

  const income = range.midpoint;
  const needs = Math.round(income * 0.5);
  const wants = Math.round(income * 0.3);
  const savings = Math.round(income * 0.2);

  return (
    <View
      style={{
        backgroundColor: `${"#10B981"}10`,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${"#10B981"}30`,
        padding: 16,
        marginTop: 16
      }}>
      
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        
        <Ionicons
          name="sparkles"
          size={16}
          color="#10B981"
          style={{ marginRight: 6 }} />
        
        <Text style={{ color: "#10B981", fontWeight: "700", fontSize: 13 }}>
          {t("onboarding.step2.preview.label")}
        </Text>
      </View>
      {[
      {
        label: t("onboarding.step2.preview.needs"),
        amount: needs,
        color: "#6366F1",
        icon: "home-outline"
      },
      {
        label: t("onboarding.step2.preview.wants"),
        amount: wants,
        color: "#F59E0B",
        icon: "heart-outline"
      },
      {
        label: t("onboarding.step2.preview.savings"),
        amount: savings,
        color: "#10B981",
        icon: "trending-up-outline"
      }].
      map((row) =>
      <View
        key={row.label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 6
        }}>
        
          <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: `${row.color}18`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10
          }}>
          
            <Ionicons name={row.icon} size={14} color={row.color} />
          </View>
          <Text style={{ color: c.textMuted, fontSize: 13, flex: 1 }}>
            {row.label}
          </Text>
          <Text style={{ color: row.color, fontWeight: "700", fontSize: 14 }}>
            {row.amount.toLocaleString("ro-RO")} RON
          </Text>
        </View>
      )}
    </View>);

}


function BudgetPlanRow({ catKey, amount, type, c, t }) {
  const cat = CATEGORIES.find((x) => x.key === catKey) || {
    icon: "ellipsis-horizontal",
    color: "#6B7280"
  };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
        borderBottomWidth: 0.5,
        borderBottomColor: c.border
      }}>
      
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: `${cat.color}18`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10
        }}>
        
        <Ionicons name={cat.icon} size={16} color={cat.color} />
      </View>
      <Text style={{ color: c.foreground, fontSize: 14, flex: 1 }}>
        {t(`analytics.categories.${catKey}`)}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontSize: 11,
          marginRight: 8,
          backgroundColor: type === "need" ? "#6366F120" : "#F59E0B20",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6
        }}>
        
        {type === "need" ? t("budget.needsLabel") : t("budget.wantsLabel")}
      </Text>
      <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }}>
        {Math.round(amount)} RON
      </Text>
    </View>);

}


export default function Onboarding() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { saveProfile } = useOnboarding();
  const { getSuggestedBudgets, applySuggestedBudgets } = useBudget();

  const TOTAL_STEPS = 4;

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(null);
  const [incomeRange, setIncomeRange] = useState(null);
  const [priorityCategories, setPriorityCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");


  function toggleCategory(key) {
    setValidationError("");
    setPriorityCategories((prev) =>
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function canAdvance() {
    if (step === 0) return !!goal;
    if (step === 1) return !!incomeRange;
    if (step === 2) return priorityCategories.length > 0;
    if (step === 3) return true;
    return false;
  }


  function getSuggestions() {
    const profile = sanitizeOnboardingPayload(
      goal,
      incomeRange,
      priorityCategories
    );
    return profile ? getSuggestedBudgets(profile) : [];
  }

  async function finishWithPlan(acceptPlan) {
    if (saving) return;

    const strictPayload = sanitizeOnboardingPayload(
      goal,
      incomeRange,
      priorityCategories
    );

    if (!strictPayload) {
      setValidationError(t("onboarding.validationError"));
      return;
    }

    setValidationError("");
    setSaving(true);
    if (acceptPlan) {
      const suggestions = getSuggestedBudgets(strictPayload);
      if (suggestions.length > 0) {
        applySuggestedBudgets(suggestions);
      }
    }
    await saveProfile(strictPayload);
    router.replace("/(tabs)");
  }


  function renderStep() {

    if (step === 0) {
      return (
        <>
          <Text
            style={{
              color: c.foreground,
              fontSize: 24,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: 8
            }}>
            
            {t("onboarding.step1.title")}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 28
            }}>
            
            {t("onboarding.step1.subtitle")}
          </Text>
          <StepHint text={t("onboarding.step1.why")} c={c} />
          {GOALS.map((g) =>
          <OptionCard
            key={g.key}
            label={t(`onboarding.goals.${g.key}.label`)}
            sublabel={t(`onboarding.goals.${g.key}.sublabel`)}
            icon={g.icon}
            color={g.color}
            selected={goal === g.key}
            onPress={() => {
              setValidationError("");
              setGoal(g.key);
            }}
            c={c} />

          )}
        </>);

    }


    if (step === 1) {
      return (
        <>
          <Text
            style={{
              color: c.foreground,
              fontSize: 24,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: 8
            }}>
            
            {t("onboarding.step2.title")}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 28
            }}>
            
            {t("onboarding.step2.subtitle")}
          </Text>
          <StepHint text={t("onboarding.step2.why")} c={c} />
          {INCOME_RANGES.map((r) =>
          <OptionCard
            key={r.key}
            label={r.label}
            icon="cash-outline"
            color="#10B981"
            selected={incomeRange === r.key}
            onPress={() => {
              setValidationError("");
              setIncomeRange(r.key);
            }}
            c={c} />

          )}
          {}
          {incomeRange &&
          <IncomePreviewCard incomeRange={incomeRange} c={c} t={t} />
          }
        </>);

    }


    if (step === 2) {
      return (
        <>
          <Text
            style={{
              color: c.foreground,
              fontSize: 24,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: 8
            }}>
            
            {t("onboarding.step3.title")}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 28
            }}>
            
            {t("onboarding.step3.subtitle")}
          </Text>
          <StepHint text={t("onboarding.step3.why")} c={c} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -4 }}>
            {PRIORITY_CATEGORIES.map((cat) =>
            <CategoryChip
              key={cat.key}
              label={t(`analytics.categories.${cat.key}`)}
              icon={cat.icon}
              color={cat.color}
              selected={priorityCategories.includes(cat.key)}
              onPress={() => toggleCategory(cat.key)}
              c={c} />

            )}
          </View>
          {priorityCategories.length === 0 &&
          <Text
            style={{
              color: c.textMuted,
              fontSize: 12,
              textAlign: "center",
              marginTop: 12
            }}>
            
              {t("onboarding.step3.hint")}
            </Text>
          }
        </>);

    }


    if (step === 3) {
      const suggestions = getSuggestions();
      const range = INCOME_RANGES.find((r) => r.key === incomeRange);
      const income = range?.midpoint || 0;
      const savingsAmount = Math.round(income * 0.2);

      return (
        <>
          <Text
            style={{
              color: c.foreground,
              fontSize: 24,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: 8
            }}>
            
            {t("onboarding.step4.title")}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 24
            }}>
            
            {t("onboarding.step4.subtitle")}
          </Text>
          <StepHint text={t("onboarding.step4.why")} c={c} />

          {suggestions.length === 0 ?
          <Text
            style={{ color: c.textMuted, textAlign: "center", fontSize: 14 }}>
            
              {t("onboarding.step4.noSuggestions")}
            </Text> :

          <>
              {}
              <View
              style={{
                backgroundColor: c.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
                marginBottom: 12
              }}>
              
                {suggestions.map((s) =>
              <BudgetPlanRow
                key={s.key}
                catKey={s.key}
                amount={s.suggestedLimit}
                type={s.type}
                c={c}
                t={t} />

              )}
              </View>

              {}
              <View
              style={{
                backgroundColor: "#10B98110",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#10B98130",
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10
              }}>
              
                <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#10B98120",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                
                  <Ionicons
                  name="trending-up-outline"
                  size={18}
                  color="#10B981" />
                
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                  style={{
                    color: "#10B981",
                    fontWeight: "700",
                    fontSize: 13
                  }}>
                  
                    {t("onboarding.step4.savingsNote")} —{" "}
                    {savingsAmount.toLocaleString("ro-RO")} RON
                  </Text>
                  <Text
                  style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                  
                    {t("onboarding.step4.savingsDesc")}
                  </Text>
                </View>
              </View>
            </>
          }
        </>);

    }
  }


  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <AuthBackground>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 64,
          paddingBottom: 40
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        
        {}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <LinearGradient
            colors={["#10B981", "#6366F1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center"
            }}>
            
            <Ionicons name="sparkles" size={28} color="#fff" />
          </LinearGradient>
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 10 }}>
            {t("onboarding.badge", { step: step + 1, total: TOTAL_STEPS })}
          </Text>
        </View>

        {}
        <ProgressDots current={step} total={TOTAL_STEPS} c={c} />

        {}
        {renderStep()}

        {}
        <View style={{ marginTop: 28, gap: 12 }}>
          {!!validationError &&
          <Text style={{ color: "#F87171", fontSize: 12, textAlign: "center" }}>
              {validationError}
            </Text>
          }
          {isLastStep ?

          <>
              <GradientButton
              onPress={() => finishWithPlan(true)}
              disabled={saving}
              label={t("onboarding.step4.accept")} />
            
            </> :

          <>
              <GradientButton
              onPress={() => {
                setValidationError("");
                setStep((s) => s + 1);
              }}
              disabled={!canAdvance() || saving}
              label={t("onboarding.next")} />
            
              {step > 0 &&
            <Pressable
              onPress={() => {
                setValidationError("");
                setStep((s) => s - 1);
              }}
              style={{ alignItems: "center", paddingVertical: 8 }}>
              
                  <Text style={{ color: c.textMuted, fontSize: 14 }}>
                    {t("onboarding.back")}
                  </Text>
                </Pressable>
            }
            </>
          }
        </View>
      </ScrollView>
    </AuthBackground>);

}