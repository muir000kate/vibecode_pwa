import { StyleSheet, View } from 'react-native';

type DropMarkProps = {
  size?: number;
};

export function DropMark({ size = 8 }: DropMarkProps) {
  const width = size * 0.78;
  const radius = width / 2;
  return (
    <View style={[styles.drop, { width, height: size }]}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          width: 0,
          height: 0,
          borderLeftWidth: radius * 0.86,
          borderRightWidth: radius * 0.86,
          borderBottomWidth: size * 0.58,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: '#C23B5A',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width,
          height: width,
          borderRadius: radius,
          backgroundColor: '#C23B5A',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    alignItems: 'center',
  },
});
