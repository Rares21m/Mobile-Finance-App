import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import SectionHeader from "../../components/SectionHeader";
import { useBudget } from "../../context/BudgetContext";
import { useTheme } from "../../context/ThemeContext";
import { CATEGORIES } from "../../utils/categoryUtils";

// ─── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ percentage, status, c }) {
  const clampedPct = Math.min(percentage ?? 0, 100);
  const color =
    status === "over"
      ? c.expense
      : status === "warning"
        ? "#F59E0B"
        : (c.success ?? "#22C55E");

  return (
    <View
      style={{
        height: 7,
        borderRadius: 4,
        backgroundColor: c.border,
        overflow: "hidden",
        marginTop: 8,
        marginBottom: 4,
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${clampedPct}%`,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// ─── Budget Item ───────────────────────────────────────────────────────────────
function BudgetItem({ categoryKey, onEdit, c, t }) {
  const { getBudgetStatus } = useBudget();
  const cat = CATEGORIES.find((x) => x.key === categoryKey);
  if (!cat) return null;
  const { spent, limit, percentage, status } = getBudgetStatus(categoryKey);
  const remaining = Math.max((limit ?? 0) - spent, 0);

  const statusColor =
    status === "over"
      ? c.expense
      : status === "warning"
        ? "#F59E0B"
        : (c.success ?? "#22C55E");

  return (
    <Pressable
      onPress={() => onEdit(cat)}
      className="active:opacity-75"
      style={{
        backgroundColor: c.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor:
          status === "over"
            ? `${c.expense}40`
            : status === "warning"
              ? "#F59E0B40"
              : c.border,
      }}
    >
      {/* Row 1: icon + name + edit icon */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${cat.color}18`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name={cat.icon} size={20} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: c.foreground,
              fontWeight: "600",
              fontSize: 15,
            }}
          >
            {t(`analytics.categories.${categoryKey}`)}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>
            {status === "over"
              ? t("budget.overBudget")
              : status === "warning"
                ? t("budget.nearLimit")
                : t("budget.remaining", {
                    amount: remaining.toFixed(0),
                    currency: t("common.currency"),
                  })}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              color: statusColor,
              fontWeight: "700",
              fontSize: 14,
            }}
          >
            {spent.toFixed(0)}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 11 }}>
            / {(limit ?? 0).toFixed(0)} {t("common.currency")}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <ProgressBar percentage={percentage} status={status} c={c} />

      {/* Row 3: percentage label */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 2,
        }}
      >
        <Text style={{ color: c.textMuted, fontSize: 11 }}>
          0 {t("common.currency")}
        </Text>
        <Text
          style={{
            color: statusColor,
            fontWeight: "600",
            fontSize: 11,
          }}
        >
          {percentage}%
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 11 }}>
          {(limit ?? 0).toFixed(0)} {t("common.currency")}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function Budget() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const {
    limits,
    loaded,
    setBudgetLimit,
    currentMonthSpending,
    totalBudgeted,
    totalSpentOnBudgeted,
    getBudgetStatus,
  } = useBudget();

  // ── Sheet state: null | 'pick' | 'edit' ─────────────────────────────────
  const [sheetMode, setSheetMode] = useState(null);
  const [pendingCat, setPendingCat] = useState(null); // { key, icon, color }
  const [amountInput, setAmountInput] = useState("");

  // ── Derived lists ────────────────────────────────────────────────────────
  const budgetedKeys = Object.keys(limits);

  // Categories that have either a budget or spending this month
  const activeBudgetKeys = useMemo(
    () => budgetedKeys.filter((k) => limits[k] > 0),
    [budgetedKeys, limits],
  );

  // Categories NOT yet budgeted (for the category picker)
  const unbudgetedCategories = useMemo(
    () => CATEGORIES.filter((cat) => !limits[cat.key]),
    [limits],
  );

  // Categories with this-month spending but no budget set
  const suggestedCategories = useMemo(
    () =>
      CATEGORIES.filter(
        (cat) => !limits[cat.key] && (currentMonthSpending[cat.key] ?? 0) > 0,
      ),
    [limits, currentMonthSpending],
  );

  // ── Summary stats ────────────────────────────────────────────────────────
  const categoriesOnBudget = useMemo(
    () =>
      activeBudgetKeys.filter((k) => getBudgetStatus(k).status !== "over")
        .length,
    [activeBudgetKeys, getBudgetStatus],
  );

  const summaryPct = useMemo(
    () =>
      totalBudgeted > 0
        ? Math.min(
            Math.round((totalSpentOnBudgeted / totalBudgeted) * 100),
            100,
          )
        : 0,
    [totalBudgeted, totalSpentOnBudgeted],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openPickSheet = () => {
    setSheetMode("pick");
    setPendingCat(null);
    setAmountInput("");
  };

  const openEditSheet = useCallback(
    (cat) => {
      setPendingCat(cat);
      setAmountInput(limits[cat.key] ? limits[cat.key].toString() : "");
      setSheetMode("edit");
    },
    [limits],
  );

  const handlePickCategory = (cat) => {
    setPendingCat(cat);
    setAmountInput("");
    setSheetMode("edit");
  };

  const handleSave = () => {
    if (!pendingCat) return;
    setBudgetLimit(pendingCat.key, amountInput);
    setSheetMode(null);
    setPendingCat(null);
    setAmountInput("");
  };

  const handleDelete = () => {
    if (!pendingCat) return;
    setBudgetLimit(pendingCat.key, null);
    setSheetMode(null);
    setPendingCat(null);
    setAmountInput("");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setPendingCat(null);
    setAmountInput("");
  };

  const isEditingExisting = pendingCat && !!limits[pendingCat.key];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ===== SCROLL CONTENT ===== */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 64,
          paddingBottom: 100,
        }}
      >
        {/* ── Summary Card ─────────────────────────────────────────────────── */}
        {activeBudgetKeys.length > 0 && (
          <View
            style={{
              backgroundColor: c.card,
              borderRadius: 20,
              padding: 20,
              marginTop: 0,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <View>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {t("budget.totalSpent")}
                </Text>
                <Text
                  style={{
                    color: c.foreground,
                    fontSize: 22,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                >
                  {totalSpentOnBudgeted.toFixed(0)}{" "}
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: c.textMuted,
                    }}
                  >
                    {t("common.currency")}
                  </Text>
                </Text>
                <Text
                  style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}
                >
                  {t("budget.outOf", {
                    amount: totalBudgeted.toFixed(0),
                    currency: t("common.currency"),
                  })}
                </Text>
              </View>
              <View
                style={{
                  alignItems: "flex-end",
                  backgroundColor: `${c.primary}15`,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: c.primary,
                    fontWeight: "700",
                    fontSize: 18,
                  }}
                >
                  {categoriesOnBudget}/{activeBudgetKeys.length}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 11 }}>
                  {t("budget.onBudget")}
                </Text>
              </View>
            </View>
            {/* Overall progress bar */}
            <ProgressBar
              percentage={summaryPct}
              status={
                summaryPct >= 100 ? "over" : summaryPct >= 75 ? "warning" : "ok"
              }
              c={c}
            />
            <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 4 }}>
              {summaryPct}% {t("budget.ofTotalBudget")}
            </Text>
          </View>
        )}

        {/* ── Active Budgets ────────────────────────────────────────────────── */}
        {activeBudgetKeys.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <SectionHeader title={t("budget.activeBudgets")} />
            {activeBudgetKeys
              .slice()
              .sort((a, b) => {
                // Sort: over > warning > ok
                const order = { over: 0, warning: 1, ok: 2 };
                return (
                  order[getBudgetStatus(a).status] -
                  order[getBudgetStatus(b).status]
                );
              })
              .map((key) => (
                <BudgetItem
                  key={key}
                  categoryKey={key}
                  onEdit={openEditSheet}
                  c={c}
                  t={t}
                />
              ))}
          </View>
        ) : (
          /* ── Empty state ─────────────────────────────────────────────────── */
          <View
            style={{
              alignItems: "center",
              paddingTop: 20,
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 20,
                alignItems: "flex-end",
              }}
            >
              <View
                style={{
                  width: 14,
                  height: 36,
                  borderRadius: 7,
                  backgroundColor: `${c.primary}25`,
                }}
              />
              <View
                style={{
                  width: 14,
                  height: 56,
                  borderRadius: 7,
                  backgroundColor: `${c.primary}55`,
                }}
              />
              <View
                style={{
                  width: 14,
                  height: 28,
                  borderRadius: 7,
                  backgroundColor: `${c.primary}35`,
                }}
              />
            </View>
            <Text
              style={{
                color: c.foreground,
                fontSize: 18,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {t("budget.emptyTitle")}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontSize: 14,
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 28,
              }}
            >
              {t("budget.emptyDesc")}
            </Text>
            <Pressable
              onPress={openPickSheet}
              className="active:opacity-70"
              style={{ overflow: "hidden", borderRadius: 14 }}
            >
              <LinearGradient
                colors={[c.primary, c.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 28,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text
                  style={{ color: "white", fontWeight: "700", fontSize: 15 }}
                >
                  {t("budget.addFirst")}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* ── Suggestions (categories with spending but no budget) ─── */}
        {suggestedCategories.length > 0 && activeBudgetKeys.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <SectionHeader title={t("budget.suggestions")} />
            <Text
              style={{
                color: c.textMuted,
                fontSize: 13,
                marginBottom: 14,
                marginTop: -4,
              }}
            >
              {t("budget.suggestionsDesc")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {suggestedCategories.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => openEditSheet(cat)}
                  className="active:opacity-70"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: `${cat.color}15`,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: `${cat.color}30`,
                  }}
                >
                  <Ionicons name={cat.icon} size={14} color={cat.color} />
                  <Text
                    style={{
                      color: cat.color,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {t(`analytics.categories.${cat.key}`)}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {(currentMonthSpending[cat.key] || 0).toFixed(0)}{" "}
                    {t("common.currency")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ===== FAB: Add budget ===== */}
      {unbudgetedCategories.length > 0 && activeBudgetKeys.length > 0 && (
        <Pressable
          onPress={openPickSheet}
          className="active:opacity-80"
          style={{
            position: "absolute",
            bottom: 28,
            right: 20,
            overflow: "hidden",
            borderRadius: 18,
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
          }}
        >
          <LinearGradient
            colors={[c.primary, c.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 54,
              height: 54,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={26} color="white" />
          </LinearGradient>
        </Pressable>
      )}

      {/* ===== CATEGORY PICKER SHEET ===== */}
      {sheetMode === "pick" && (
        <Pressable
          onPress={closeSheet}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: c.overlay,
          }}
        >
          <View style={{ flex: 1 }} />
        </Pressable>
      )}
      {sheetMode === "pick" && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: c.surface,
            borderTopWidth: 1,
            borderTopColor: c.border,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 48,
            maxHeight: "70%",
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.handle,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              color: c.foreground,
              fontWeight: "700",
              fontSize: 18,
              marginBottom: 4,
            }}
          >
            {t("budget.pickCategory")}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {t("budget.pickCategoryDesc")}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {unbudgetedCategories.map((cat) => {
              const spent = currentMonthSpending[cat.key] || 0;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => handlePickCategory(cat)}
                  className="active:opacity-70"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 13,
                    borderBottomWidth: 0.5,
                    borderBottomColor: c.border,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: `${cat.color}18`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <Ionicons name={cat.icon} size={18} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: c.foreground,
                        fontWeight: "600",
                        fontSize: 15,
                      }}
                    >
                      {t(`analytics.categories.${cat.key}`)}
                    </Text>
                    {spent > 0 && (
                      <Text
                        style={{
                          color: c.textMuted,
                          fontSize: 12,
                          marginTop: 1,
                        }}
                      >
                        {t("budget.spentThisMonth", {
                          amount: spent.toFixed(0),
                          currency: t("common.currency"),
                        })}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={c.textMuted}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={closeSheet}
            style={{ alignItems: "center", paddingTop: 16 }}
          >
            <Text
              style={{ color: c.textMuted, fontWeight: "500", fontSize: 14 }}
            >
              {t("common.cancel")}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ===== EDIT AMOUNT SHEET ===== */}
      {sheetMode === "edit" && (
        <Pressable
          onPress={closeSheet}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: c.overlay,
          }}
        >
          <View style={{ flex: 1 }} />
        </Pressable>
      )}
      {sheetMode === "edit" && pendingCat && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "position" : undefined}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <View
            style={{
              backgroundColor: c.surface,
              borderTopWidth: 1,
              borderTopColor: c.border,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 48,
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.handle,
                alignSelf: "center",
                marginBottom: 24,
              }}
            />
            {/* Category label */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: `${pendingCat.color}18`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <Ionicons
                  name={pendingCat.icon}
                  size={22}
                  color={pendingCat.color}
                />
              </View>
              <View>
                <Text
                  style={{
                    color: c.textMuted,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {t("budget.budgetFor")}
                </Text>
                <Text
                  style={{
                    color: c.foreground,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {t(`analytics.categories.${pendingCat.key}`)}
                </Text>
              </View>
            </View>

            {/* Amount input */}
            <Text
              style={{
                color: c.textMuted,
                fontSize: 13,
                fontWeight: "500",
                marginBottom: 8,
              }}
            >
              {t("budget.monthlyLimit")} ({t("common.currency")})
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: c.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: c.border,
                paddingHorizontal: 16,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: c.textMuted,
                  fontSize: 16,
                  fontWeight: "500",
                  marginRight: 8,
                }}
              >
                {t("common.currency")}
              </Text>
              <TextInput
                style={{
                  flex: 1,
                  color: c.foreground,
                  fontSize: 22,
                  fontWeight: "700",
                  paddingVertical: 14,
                }}
                placeholder="0"
                placeholderTextColor={c.placeholder}
                value={amountInput}
                onChangeText={setAmountInput}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {/* Buttons */}
            <Pressable
              onPress={handleSave}
              className="active:opacity-80"
              style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12 }}
            >
              <LinearGradient
                colors={[c.primary, c.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 15,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "white", fontWeight: "700", fontSize: 16 }}
                >
                  {t("common.save")}
                </Text>
              </LinearGradient>
            </Pressable>

            {isEditingExisting && (
              <Pressable
                onPress={handleDelete}
                className="active:opacity-70"
                style={{
                  paddingVertical: 13,
                  alignItems: "center",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: `${c.expense}40`,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    color: c.expense,
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
                  {t("budget.removeBudget")}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={closeSheet}
              style={{ alignItems: "center", paddingTop: 12 }}
            >
              <Text
                style={{ color: c.textMuted, fontWeight: "500", fontSize: 14 }}
              >
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
