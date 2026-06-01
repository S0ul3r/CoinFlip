import { useAppTheme } from '@/contexts/AppThemeContext';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, TextInput } from 'react-native-paper';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value.trim())) return null;
  const d = new Date(`${value.trim()}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Props = {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
};

export function DatePickerField({ label, value, onChange, placeholder = '2025-01-15' }: Props) {
  const { colors } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  const pickerDate = useMemo(() => parseIsoDate(value) ?? new Date(), [value]);

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed') return;
    if (selected) onChange(formatIsoDate(selected));
  };

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          label={label}
          mode="outlined"
          placeholder={placeholder}
          value={value}
          onChangeText={onChange}
          style={styles.input}
        />
        <IconButton
          icon="calendar"
          mode="contained-tonal"
          onPress={() => setShowPicker(true)}
          accessibilityLabel="Wybierz datę z kalendarza"
        />
      </View>
      {showPicker ? (
        Platform.OS === 'ios' ? (
          <View style={[styles.iosSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.iosHeader}>
              <Pressable onPress={() => setShowPicker(false)}>
                <Text style={{ color: colors.accent, fontWeight: '600' }}>Gotowe</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="spinner"
              onChange={onPickerChange}
              locale="pl-PL"
            />
          </View>
        ) : (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="default"
            onChange={onPickerChange}
          />
        )
      ) : null}
      <Text variant="bodySmall" style={{ color: colors.textSubtle, marginTop: 4 }}>
        Możesz wpisać datę ręcznie (RRRR-MM-DD) lub wybrać z kalendarza.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  input: { flex: 1 },
  iosSheet: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});
