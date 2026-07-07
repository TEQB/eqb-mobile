import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react-native";

interface VoteButtonsProps {
  solutionId: string;
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  isOwn: boolean;
}

export function VoteButtons({
  solutionId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote,
  isOwn,
}: VoteButtonsProps) {
  const { supabase, user } = useAuth();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);

  const handleVote = async (vote: "up" | "down") => {
    if (isOwn || !user) return;

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as { id: string } | null;
    if (!profile) return;

    if (userVote === vote) return;
    if (userVote === "up") setUpvotes((p) => p - 1);
    if (userVote === "down") setDownvotes((p) => p - 1);
    setUpvotes((p) => p + (vote === "up" ? 1 : 0));
    setDownvotes((p) => p + (vote === "down" ? 1 : 0));
    setUserVote(vote);

    const { error } = await supabase.from("solution_votes").insert({
      solution_id: solutionId,
      voter_id: profile.id,
      vote,
    } as never);

    if (error) {
      setUpvotes(initialUpvotes);
      setDownvotes(initialDownvotes);
      setUserVote(initialUserVote);
    }
  };

  return (
    <View className="flex-row items-center gap-1">
      <TouchableOpacity
        onPress={() => handleVote("up")}
        disabled={isOwn}
        className={cn(
          "flex-row items-center gap-1 rounded-md px-2 py-1",
          userVote === "up" ? "bg-green-50" : "",
          isOwn && "opacity-50",
        )}
      >
        <ArrowUp
          size={14}
          className={userVote === "up" ? "text-green-600" : "text-gray-500"}
        />
        <Text
          className={cn(
            "text-xs font-medium",
            userVote === "up" ? "text-green-600" : "text-gray-500",
          )}
        >
          {upvotes}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleVote("down")}
        disabled={isOwn}
        className={cn(
          "flex-row items-center gap-1 rounded-md px-2 py-1",
          userVote === "down" ? "bg-red-50" : "",
          isOwn && "opacity-50",
        )}
      >
        <ArrowDown
          size={14}
          className={userVote === "down" ? "text-red-600" : "text-gray-500"}
        />
        <Text
          className={cn(
            "text-xs font-medium",
            userVote === "down" ? "text-red-600" : "text-gray-500",
          )}
        >
          {downvotes}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
