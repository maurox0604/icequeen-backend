// components/costeo/IngredientesTab.js
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useState } from "react";
import { useCosteo } from "../../context/CosteoContext";

const UNIDADES = ["gr", "ml", "unidad"];
const EMPTY = {
  nombre: "",
  unidad: "gr",
  precio_compra: "", // precio total pagado
  cantidad_compra: "", // cuántos gr/ml/unidades se compraron
  proveedor: "",
};

const calcPrecioUnidad = (precio, cantidad) => {
  const p = Number(precio);
  const c = Number(cantidad);
  if (!p || !c) return null;
  return p / c;
};

// Ice Queen
export default function IngredientesTab() {
  const { ingredientes, guardarIngrediente, borrarIngrediente } = useCosteo();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const precioUnd = calcPrecioUnidad(form.precio_compra, form.cantidad_compra);

  const abrir = (item = null) => {
    setEditId(item?.id ?? null);
    setForm(
      item
        ? {
            nombre: item.nombre,
            unidad: item.unidad,
            precio_compra: String(item.precio_compra ?? ""),
            cantidad_compra: String(item.cantidad_compra ?? ""),
            proveedor: item.proveedor ?? "",
          }
        : EMPTY,
    );
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return Alert.alert("Nombre requerido");
    if (!form.precio_compra) return Alert.alert("Ingresa el precio de compra");
    if (!form.cantidad_compra)
      return Alert.alert("Ingresa la cantidad comprada");
    const precio_unidad = calcPrecioUnidad(
      form.precio_compra,
      form.cantidad_compra,
    );
    await guardarIngrediente(
      {
        nombre: form.nombre,
        unidad: form.unidad,
        precio_compra: Number(form.precio_compra),
        cantidad_compra: Number(form.cantidad_compra),
        precio_unidad, // calculado automáticamente
        proveedor: form.proveedor,
      },
      editId,
    );
    setModal(false);
  };

  const borrar = (item) =>
    Alert.alert("Eliminar", `¿Eliminar ${item.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => borrarIngrediente(item.id),
      },
    ]);

  return (
    <View style={s.container}>
      <Pressable style={s.addBtn} onPress={() => abrir()}>
        <Text style={s.addBtnText}>+ Nuevo ingrediente</Text>
      </Pressable>

      <FlatList
        data={ingredientes}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={
          <Text style={s.empty}>No hay ingredientes. Agrega el primero.</Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{item.nombre}</Text>
              <Text style={s.detalle}>
                ${Number(item.precio_unidad).toFixed(4)} / {item.unidad}
                {item.precio_compra
                  ? `  ·  $${Number(item.precio_compra).toLocaleString("es-CO")} × ${item.cantidad_compra} ${item.unidad}`
                  : ""}
                {item.proveedor ? `  ·  ${item.proveedor}` : ""}
              </Text>
            </View>
            <Pressable onPress={() => abrir(item)} style={s.editBtn}>
              <Text>✏️</Text>
            </Pressable>
            <Pressable onPress={() => borrar(item)} style={s.editBtn}>
              <Text>🗑️</Text>
            </Pressable>
          </View>
        )}
      />

      <Modal
        visible={modal}
        transparent
        animationType="fade"
        onRequestClose={() => setModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              {editId ? "Editar" : "Nuevo"} ingrediente
            </Text>

            <Text style={s.label}>Nombre</Text>
            <TextInput
              style={s.input}
              value={form.nombre}
              onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))}
              placeholder="ej: Leche en polvo"
            />

            <Text style={s.label}>Unidad</Text>
            <View style={s.chipRow}>
              {UNIDADES.map((u) => (
                <Pressable
                  key={u}
                  style={[s.chip, form.unidad === u && s.chipActivo]}
                  onPress={() => setForm((f) => ({ ...f, unidad: u }))}
                >
                  <Text
                    style={[s.chipText, form.unidad === u && s.chipTextActivo]}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Precio de compra + cantidad → cálculo automático */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Precio total de compra ($)</Text>
                <TextInput
                  style={s.input}
                  value={form.precio_compra}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, precio_compra: v }))
                  }
                  keyboardType="numeric"
                  placeholder="ej: 8500"
                />
              </View>
              <View style={s.divider} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Cantidad comprada ({form.unidad})</Text>
                <TextInput
                  style={s.input}
                  value={form.cantidad_compra}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, cantidad_compra: v }))
                  }
                  keyboardType="numeric"
                  placeholder="ej: 500"
                />
              </View>
            </View>

            {/* Resultado automático */}
            <View style={s.resultRow}>
              <Text style={s.resultLabel}>Costo por {form.unidad}:</Text>
              <Text style={s.resultValor}>
                {precioUnd !== null ? `$${precioUnd.toFixed(4)}` : "—"}
              </Text>
            </View>

            <Text style={s.label}>Proveedor (opcional)</Text>
            <TextInput
              style={s.input}
              value={form.proveedor}
              onChangeText={(v) => setForm((f) => ({ ...f, proveedor: v }))}
              placeholder="ej: Lácteos del Valle"
            />

            <View style={s.modalBtns}>
              <Pressable style={s.cancelBtn} onPress={() => setModal(false)}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.saveBtn} onPress={guardar}>
                <Text style={s.saveBtnText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  addBtn: {
    margin: 12,
    backgroundColor: "#e91e63",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { textAlign: "center", color: "#aaa", fontSize: 13, marginTop: 20 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  nombre: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  detalle: { fontSize: 12, color: "#777", marginTop: 2 },
  editBtn: { padding: 6 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: { backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 6 },
  modalTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  label: { fontSize: 12, color: "#666", fontWeight: "600", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fafafa",
    marginTop: 4,
  },

  row: { flexDirection: "row", alignItems: "flex-start", marginTop: 4 },
  divider: { width: 10 },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fce4ec",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  resultLabel: { fontSize: 13, color: "#c2185b", fontWeight: "600" },
  resultValor: { fontSize: 14, color: "#c2185b", fontWeight: "800" },

  chipRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  chipActivo: { backgroundColor: "#fce4ec" },
  chipText: { fontSize: 13, color: "#666" },
  chipTextActivo: { color: "#e91e63", fontWeight: "700" },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  cancelBtnText: { color: "#666", fontWeight: "600" },
  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#e91e63",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});
