import React, { forwardRef } from 'react';
import { Platform, Text, TextInput, View, type TextInputProps } from 'react-native';
import { F, ls, useCores } from './tema';

/** .field: rótulo mono 10px e campo só com sublinhado, Archivo 500 17px. */
export const Campo = forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps & { rotulo: string }>(function Campo({ rotulo, style, ...props }, ref) {
  const c = useCores();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6, marginBottom: 16 }}>
      <Text style={{ fontFamily: F.mono600, fontSize: 10, lineHeight: 12, letterSpacing: ls(0.1, 10), textTransform: 'uppercase', color: c.ink2 }}>{rotulo}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={c.ink2 + 'BF'}
        selectionColor={c.ink}
        style={[{ paddingVertical: 8, paddingHorizontal: 0, borderBottomWidth: 1.5, borderBottomColor: c.ink, fontFamily: F.sans500, fontSize: 17, lineHeight: 21, color: c.ink }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), style]}
        accessibilityLabel={rotulo}
        {...props}
      />
    </View>
  );
});

export function Rotulo({ texto }: { texto: string }) {
  const c = useCores();
  return <Text style={{ fontFamily: F.mono600, fontSize: 10, lineHeight: 12, letterSpacing: ls(0.1, 10), textTransform: 'uppercase', color: c.ink2 }}>{texto}</Text>;
}

export function Paragrafo({ texto, cor }: { texto: string; cor?: string }) {
  const c = useCores();
  return <Text style={{ fontFamily: F.sans, fontSize: 14, lineHeight: 21, color: cor ?? c.ink2, marginBottom: 18 }}>{texto}</Text>;
}
