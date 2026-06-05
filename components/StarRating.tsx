import { View, Text, TouchableOpacity } from 'react-native';

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}

export function StarRating({ rating, onRate, readonly = false, size = 20 }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View className="flex-row gap-0.5">
      {stars.map((star) => {
        const filled = star <= Math.round(rating);
        const StarEl = (
          <Text style={{ fontSize: size }} className={filled ? 'text-wine-400' : 'text-stone-700'}>
            ★
          </Text>
        );

        if (readonly) return <View key={star}>{StarEl}</View>;

        return (
          <TouchableOpacity key={star} onPress={() => onRate?.(star)} hitSlop={6}>
            {StarEl}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
