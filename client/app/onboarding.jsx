/**
 * @fileoverview Onboarding wizard — shown once after registration.
 * Collects 3 pieces of financial profile data:
 *   1. Primary financial goal
 *   2. Approximate monthly income range
 *   3. Spending categories to prioritise
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import AuthBackground from "../components/AuthBackground";
import GradientButton from "../components/GradientButton";
import { useOnboarding } from "../context/OnboardingContext";
import { useTheme } from "../context/ThemeContext";

// ─── Data definitions ─────────────────────────────────────────────────────────

const GOALS = [
  { key: "savings", icon: "wallet-outline", color: "#10B981" },
  { key: "expense_control", icon: "bar-chart-outline", color: "#6366F1" },
  { key: "investment", icon: "trending-up-outline", color: "#F59E0B" },
  { key: "debt_freedom", icon: "shield-checkmark-outline", color: "#EF4444" },
];

const INCOME_RANGES = [
  { key: "under_1500", label: "< 1 500 RON" },
  { key: "1500_3000", label: "1 500 – 3 000 RON" },
  { key: "3000_6000", label: "3 000 – 6 000 RON" },
  { key: "over_6000", label: "> 6 000 RON" },
];

const PRIORITY_CATEGORIES = [
  { key: "food", icon: "restaurant", color: "#F59E0B" },
  { key: "transport", icon: "car", color: "#3B82F6" },
  { key: "shopping", icon: "bag-handle", color: "#EC4899" },
  { key: "utilities", icon: "flash", color: "#8B5CF6" },
  { key: "housing", icon: "home", color: "#14B8A6" },
  { key: "entertainment", icon: "game-controller", color: "#F97316" },
  { key: "health", icon: "medkit", color: "#EF4444" },
  { key: "other", icon: "ellipsis-horizontal", color: "#6B7280" },
];

// ─── OptionCard ───────────────────────────────────────────────────────────────
function OptionCard({ label, sublabel, icon, color, selected, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? `${color}18` : c.card,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: selected ? color : c.border,
        padding: 16,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: `${color}18`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.foreground, fontWeight: "600", fontSize: 15 }}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={color} />}
    </Pressable>
  );
}

// ─── CategoryChip (multi-select) ─────────────────────────────────────────────
function CategoryChip({ label, icon, color, selected, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
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
        flex: 1,
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={color}
        style={{ marginRight: 6 }}
      />
      <Text
        style={{
          color: selected ? color : c.textMuted,
          fontSize: 13,
          fontWeight: selected ? "600" : "400",
          flex: 1,
        }}
      >
        {label}
      </Text>
      {selected && <Ionicons name="checkmark" size={14} color={color} />}
    </Pressable>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ current, total, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 32,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i <= current ? "#10B981" : c.border,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { saveProfile } = useOnboarding();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(null);
  const [incomeRange, setIncomeRange] = useState(null);
  const [priorityCategories, setPriorityCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────
  function toggleCategory(key) {
    setPriorityCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function canAdvance() {
    if (step === 0) return !!goal;
    if (step === 1) return !!incomeRange;
    if (step === 2) return priorityCategories.length > 0;
    return false;
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    await saveProfile({ goal, incomeRange, priorityCategories });
    router.replace("/(tabs)");
  }

  // ── Step content ─────────────────────────────────────────────────────────
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
              marginBottom: 8,
            }}
          >
            {t("onboarding.step1.title")}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            {t("onboarding.step1.subtitle")}
          </Text>
          {GOALS.map((g) => (
            <OptionCard
              key={g.key}
              label={t(`onboarding.goals.${g.key}.label`)}
              sublabel={t(`onboarding.goals.${g.key}.sublabel`)}
              icon={g.icon}
              color={g.color}
              selected={goal === g.key}
              onPress={() => setGoal(g.key)}
              c={c}
            />
          ))}
        </>
      );
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
              marginBottom: 8,
            }}
          >
            {t("onboarding.step2.title")}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            {t("onboarding.step2.subtitle")}
          </Text>
          {INCOME_RANGES.map((r) => (
            <OptionCard
              key={r.key}
              label={r.label}
              icon="cash-outline"
              color="#10B981"
              selected={incomeRange === r.key}
              onPress={() => setIncomeRange(r.key)}
              c={c}
            />
          ))}
        </>
      );
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
              marginBottom: 8,
            }}
          >
            {t("onboarding.step3.title")}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            {t("onboarding.step3.subtitle")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -4 }}>
            {PRIORITY_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.key}
                label={t(`analytics.categories.${cat.key}`)}
                icon={cat.icon}
                color={cat.color}
                selected={priorityCategories.includes(cat.key)}
                onPress={() => toggleCategory(cat.key)}
                c={c}
              />
            ))}
          </View>
          {priorityCategories.length === 0 && (
            <Text
              style={{
                color: c.textMuted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              {t("onboarding.step3.hint")}
            </Text>
          )}
        </>
      );
    }
  }

  return (
    <AuthBackground>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 64,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Skip button */}
        <Pressable
          onPress={finish}
          style={{ position: "absolute", top: 56, right: 24, zIndex: 10 }}
        >
          <Text style={{ color: c.textMuted, fontSize: 14 }}>
            {t("onboarding.skip")}
          </Text>
        </Pressable>

        {/* Logo / badge */}
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
              justifyContent: "center",
            }}
          >
            <Ionicons name="sparkles" size={28} color="#fff" />
          </LinearGradient>
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 10 }}>
            {t("onboarding.badge", { step: step + 1, total: 3 })}
          </Text>
        </View>

        {/* Progress */}
        <ProgressDots current={step} total={3} c={c} />

        {/* Step content */}
        {renderStep()}

        {/* Navigation buttons */}
        <View style={{ marginTop: 28, gap: 12 }}>
          <GradientButton
            onPress={step < 2 ? () => setStep((s) => s + 1) : finish}
            disabled={!canAdvance() || saving}
            label={step < 2 ? t("onboarding.next") : t("onboarding.finish")}
          />
          {step > 0 && (
            <Pressable
              onPress={() => setStep((s) => s - 1)}
              style={{ alignItems: "center", paddingVertical: 8 }}
            >
              <Text style={{ color: c.textMuted, fontSize: 14 }}>
                {t("onboarding.back")}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </AuthBackground>
  );
}
