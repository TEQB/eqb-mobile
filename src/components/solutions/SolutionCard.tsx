import { useState } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { getApiBaseUrl } from "@/lib/env";
import { getSupabaseClient } from "@/lib/supabase/client";
import { VoteButtons } from "./VoteButtons";
import { RatingStars } from "./RatingStars";
import { FileText } from "lucide-react-native";
import { Paths, File } from "expo-file-system";
import * as WebBrowser from "expo-web-browser";

interface SolutionCardProps {
  id: string;
  body: string | null;
  fileUrl: string | null;
  authorName: string;
  upvotes: number;
  downvotes: number;
  userVote: "up" | "down" | null;
  isOwn: boolean;
  createdAt: string;
  ratingSum: number;
  ratingCount: number;
  userRating: number | null;
}

export function SolutionCard({
  id,
  body,
  fileUrl,
  authorName,
  upvotes,
  downvotes,
  userVote,
  isOwn,
  createdAt,
  ratingSum,
  ratingCount,
  userRating,
}: SolutionCardProps) {
  const API_BASE = getApiBaseUrl();
  const supabase = getSupabaseClient();
  const [opening, setOpening] = useState(false);

  const openFile = async () => {
    if (!fileUrl || opening) return;
    setOpening(true);
    try {
      const fileUrlStr = `${API_BASE}/api/storage/${fileUrl}`;
      const isImage = /\.(jpg|jpeg|png)$/i.test(fileUrlStr);

      if (isImage) {
        // For images, open directly in browser (approved bucket doesn't need auth)
        // But solutions bucket needs Bearer auth — download first
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          Alert.alert("Error", "Please log in again.");
          return;
        }
        const destFile = new File(Paths.cache, `solution-${id}.${fileUrl.split(".").pop()}`);
        const downloaded = await File.downloadFileAsync(fileUrlStr, destFile, {
          idempotent: true,
          headers: { Authorization: `Bearer ${token}` },
        });
        await WebBrowser.openBrowserAsync(downloaded.uri);
      } else {
        // For PDFs, download and open
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          Alert.alert("Error", "Please log in again.");
          return;
        }
        const destFile = new File(Paths.cache, `solution-${id}.pdf`);
        const downloaded = await File.downloadFileAsync(fileUrlStr, destFile, {
          idempotent: true,
          headers: { Authorization: `Bearer ${token}` },
        });
        await WebBrowser.openBrowserAsync(downloaded.uri);
      }
    } catch {
      Alert.alert("Error", "Failed to open attachment");
    } finally {
      setOpening(false);
    }
  };

  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4 mb-3">
      <View className="flex-row justify-between">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-sm font-semibold text-gray-900">{authorName}</Text>
            {isOwn && (
              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-primary uppercase tracking-wide">You</Text>
              </View>
            )}
          </View>
          {body && (
            <Text className="text-sm text-gray-700 mb-2">{body}</Text>
          )}
          {fileUrl && (
            <TouchableOpacity
              onPress={openFile}
              disabled={opening}
              className="flex-row items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 mb-2"
            >
              {opening ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <FileText size={16} className="text-gray-500" />
              )}
              <Text className="text-sm text-gray-700">
                {opening ? "Opening..." : "View attachment"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <VoteButtons
          solutionId={id}
          upvotes={upvotes}
          downvotes={downvotes}
          userVote={userVote}
          isOwn={isOwn}
        />
      </View>
      <View className="flex-row items-center justify-between border-t border-gray-100 pt-3 mt-2">
        <RatingStars
          solutionId={id}
          ratingCount={ratingCount}
          ratingSum={ratingSum}
          initialUserRating={userRating}
          isOwn={isOwn}
        />
        <Text className="text-xs text-gray-400">
          {new Date(createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}
