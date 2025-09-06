import * as React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
} from "react-native";

export type BannerItem = {
  key: string;
  title?: string;
  image: any;       // require(...) か { uri }
  onPress?: () => void;
};

export const BannerCarousel = ({
  items,
  height = 96,
  interval,
  cardsPerScreen = 1,
  gap = 12,
  showDots = true,
}: {
  items: BannerItem[];
  height?: number;
  interval?: number;
  cardsPerScreen?: number; // 1以上: 1=フル幅、2.2=2枚+チラ見せ
  gap?: number;            // アイテム間余白(px)
  showDots?: boolean;      // ドット表示切替
}) => {
  const listRef = React.useRef<FlatList<BannerItem> | null>(null);
  const [index, setIndex] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);

  const pageWidth = React.useMemo(() => {
    if (containerWidth === 0) return 0;
    const cps = Math.max(1, Number(cardsPerScreen || 1));
    const totalGap = gap * (cps - 1);
    return (containerWidth - totalGap) / cps;
  }, [containerWidth, cardsPerScreen, gap]);

  const handleScroll = React.useCallback((e: any) => {
    if (containerWidth === 0) return;
    const x = e?.nativeEvent?.contentOffset?.x ?? 0;
    const stride = pageWidth + gap;
    const i = stride > 0 ? Math.max(0, Math.min(items.length - 1, Math.round(x / stride))) : 0;
    if (i !== index) setIndex(i);
  }, [containerWidth, items.length, index, pageWidth, gap]);

  // auto slide
  React.useEffect(() => {
    if (!items?.length || containerWidth === 0 || pageWidth === 0 || !interval || interval <= 0) return;
    const id = setInterval(() => {
      const next = (index + 1) % items.length;
      setIndex(next);
      listRef.current?.scrollToOffset({ offset: next * (pageWidth + gap), animated: true });
    }, interval);
    return () => clearInterval(id);
  }, [index, items?.length, interval, containerWidth, pageWidth, gap]);

  const renderItem = ({ item }: ListRenderItemInfo<BannerItem>) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={item.onPress}
      style={{ width: pageWidth, height, marginRight: gap }}
    >
      <View
        style={{
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#111827",
        }}
      >
        <Image
          source={item.image}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        {!!item.title && (
          <View
            style={{
              position: "absolute",
              left: 12,
              bottom: 10,
              backgroundColor: "rgba(0,0,0,0.35)",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>{item.title}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={{ marginTop: 12 }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setContainerWidth(w);
        if (w > 0 && index >= items.length) setIndex(0);
      }}
    >
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={pageWidth > 0 ? pageWidth + gap : undefined}
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(it) => it.key}
        renderItem={renderItem}
        style={{ width: "100%", height }}
        onScrollToIndexFailed={() => {}}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingRight: gap }}
      />
      {/* dots */}
      {showDots && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {items.map((_, i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: i === index ? "#111827" : "#D1D5DB" }} />
          ))}
        </View>
      )}
    </View>
  );
};