import { useRef } from "react";
import { Text, TextInput, View } from "react-native";
import { Select, type SelectOption } from "@/components/ui/Select";

interface MatricInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

const GENDER_OPTIONS: SelectOption[] = [
  { label: "1 — Male", value: "1" },
  { label: "2 — Female", value: "2" },
];

function parseValue(value: string = "") {
  const parts = value.split("/");
  return { year: parts[1] || "", gender: parts[2] || "", id: parts[3] || "" };
}

const segmentInputClass =
  "h-11 rounded-lg border border-border bg-white text-center text-sm font-semibold text-foreground";

export function MatricInput({ value = "", onChange, onBlur }: MatricInputProps) {
  const segments = parseValue(value);
  const yearRef = useRef<any>(null);
  const idRef = useRef<any>(null);

  const emit = (year: string, gender: string, id: string) => {
    onChange?.(`125/${year}/${gender}/${id}`);
  };

  const handleYearChange = (text: string) => {
    const v = text.replace(/\D/g, "").slice(0, 2);
    emit(v, segments.gender, segments.id);
    if (v.length === 2) {
      idRef.current?.focus();
    }
  };

  const handleGenderChange = (v: string) => {
    emit(segments.year, v, segments.id);
  };

  const handleIdChange = (text: string) => {
    const v = text.replace(/\D/g, "").slice(0, 4);
    emit(segments.year, segments.gender, v);
  };

  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {/* static 125 */}
      <View
        className="h-11 items-center justify-center rounded-lg border border-border bg-primary/5 px-2.5"
        style={{ minWidth: 44 }}
      >
        <Text className="text-sm font-bold tracking-tight text-primary">125</Text>
      </View>

      <Text className="text-xs font-light text-border">/</Text>

      {/* year */}
      <TextInput
        ref={yearRef}
        className={segmentInputClass}
        style={{ width: 52 }}
        placeholder="YY"
        placeholderTextColor="#D8C8C0"
        keyboardType="number-pad"
        maxLength={2}
        value={segments.year}
        onChangeText={handleYearChange}
        onBlur={onBlur}
      />

      <Text className="text-xs font-light text-border">/</Text>

      {/* gender */}
      <Select
        value={segments.gender}
        onValueChange={handleGenderChange}
        options={GENDER_OPTIONS}
        placeholder="Gender"
        style={{ width: 116, height: 44, paddingHorizontal: 12 }}
      />

      <Text className="text-xs font-light text-border">/</Text>

      {/* id */}
      <TextInput
        ref={idRef}
        className={segmentInputClass}
        style={{ width: 72 }}
        placeholder="####"
        placeholderTextColor="#D8C8C0"
        keyboardType="number-pad"
        maxLength={4}
        value={segments.id}
        onChangeText={handleIdChange}
        onBlur={onBlur}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === "Backspace" && segments.id.length === 0) {
            yearRef.current?.focus();
          }
        }}
      />
    </View>
  );
}
