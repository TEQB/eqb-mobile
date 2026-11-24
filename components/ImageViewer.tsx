import React from "react";
import {
  Modal, View, Image, TouchableOpacity, ActivityIndicator,
  Dimensions, StyleSheet, StatusBar,
} from "react-native";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react-native";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";

interface ImageViewerProps {
  visible: boolean;
  uri: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get("window");

export function ImageViewer({ visible, uri, onClose }: ImageViewerProps) {
  const [loading, setLoading] = React.useState(true);
  const [scale, setScale] = React.useState(1);
  const [downloading, setDownloading] = React.useState(false);

  const handleSave = async () => {
    setDownloading(true);
    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access photo library is required");
        return;
      }

      // Download file
      const filename = uri.split("/").pop() || `image-${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.downloadAsync(uri, fileUri);

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("EQB", asset, false);
      alert("Image saved to photo library");
    } catch (e) {
      console.error(e);
      alert("Failed to save image");
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <X size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.zoomControls}>
            <TouchableOpacity onPress={handleZoomOut} style={styles.headerButton}>
              <ZoomOut size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleZoomIn} style={styles.headerButton}>
              <ZoomIn size={24} color="white" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={downloading}>
            {downloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Download size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          {loading && <ActivityIndicator size="large" color="white" style={styles.loader} />}
          <Image
            source={{ uri }}
            style={[styles.image, { transform: [{ scale }] }]}
            resizeMode="contain"
            onLoad={() => setLoading(false)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerButton: {
    padding: 8,
  },
  zoomControls: {
    flexDirection: "row",
    gap: 16,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width,
    height: height * 0.7,
  },
  loader: {
    position: "absolute",
  },
});
