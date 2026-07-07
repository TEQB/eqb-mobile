import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react-native";

interface RatingStarsProps {
  solutionId: string;
  ratingCount: number;
  ratingSum: number;
  initialUserRating: number | null;
  isOwn: boolean;
}

export function RatingStars({
  solutionId,
  ratingCount,
  ratingSum,
  initialUserRating,
  isOwn,
}: RatingStarsProps) {
  const { supabase, user } = useAuth();
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [sum, setSum] = useState(ratingSum);
  const [count, setCount] = useState(ratingCount);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUserRating(initialUserRating);
    setSum(ratingSum);
    setCount(ratingCount);
  }, [initialUserRating, ratingSum, ratingCount]);

  const average = count > 0 ? sum / count : 0;

  const submit = async (rating: number) => {
    if (isOwn || submitting || !user) return;
    setSubmitting(true);

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as { id: string } | null;
    if (!profile) { setSubmitting(false); return; }

    const { error } = await supabase
      .from("solution_ratings")
      .upsert(
        {
          solution_id: solutionId,
          rater_id: profile.id,
          rating,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "solution_id,rater_id" },
      );

    if (!error) {
      setUserRating(rating);
      if (initialUserRating == null) {
        setSum((p) => p + rating);
        setCount((p) => p + 1);
      } else {
        setSum((p) => p + (rating - initialUserRating));
      }
    }
    setSubmitting(false);
  };

  const display = userRating ?? Math.round(average);

  if (isOwn) {
    return (
      <View className="flex-row items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= display && count > 0 ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
          />
        ))}
        <Text className="text-xs text-gray-500 ml-1">
          {count === 0 ? "No ratings" : `${average.toFixed(1)}`}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => submit(star)}
          disabled={submitting}
        >
          <Star
            size={16}
            className={cn(
              star <= display
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300",
              submitting && "opacity-60",
            )}
          />
        </TouchableOpacity>
      ))}
      <Text className="text-xs text-gray-500 ml-1">
        {count === 0
          ? "Rate"
          : `${average.toFixed(1)} (${count})`}
      </Text>
    </View>
  );
}
