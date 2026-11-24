import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Check, ChevronDown } from "lucide-react-native";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  disabled,
  style,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`h-12 flex-row items-center justify-between rounded-xl border border-input bg-white/90 px-4 ${
          disabled ? "opacity-50" : ""
        }`}
        style={style}
      >
        <Text
          className={`flex-1 text-base ${selected ? "text-foreground" : "text-muted-foreground"}`}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color="#6C5560" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/40 px-6"
          onPress={() => setOpen(false)}
        >
          <View
            style={{ width: "100%", maxWidth: 384 }}
            className="rounded-2xl bg-white p-2"
            onStartShouldSetResponder={() => true}
          >
            <ScrollView style={{ maxHeight: 320 }} bounces={false}>
              {options.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  className="flex-row items-center justify-between rounded-xl px-4 py-3"
                  onPress={() => {
                    onValueChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Text className="flex-1 text-base text-foreground">{o.label}</Text>
                  {o.value === value ? <Check size={18} color="#7A1030" /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
