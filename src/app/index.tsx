import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Button, FlatList, SafeAreaView, Text, TextInput, View } from "react-native";
import { auth, db } from "./firebaseConfig";

type Livro = { id?: string; nome: string; ano: number; escritor: string; editora: string; genero: string; paginas: number };
const vazio = { nome: "", ano: "", escritor: "", editora: "", genero: "", paginas: "" };
const campos = ["nome", "ano", "escritor", "editora", "genero", "paginas"] as const;
const input = { borderWidth: 1, borderColor: "#999", borderRadius: 6, padding: 8, marginVertical: 4 };

export default function App() {
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [livros, setLivros] = useState<Livro[]>([]);
  const [form, setForm] = useState<Record<string, string>>(vazio);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => { if (u) setRole("user"); setCarregando(false); }), []);

  useEffect(() => {
    if (!role) return;
    return onSnapshot(collection(db, "livros"), (s) =>
      setLivros(s.docs.map((d) => ({ id: d.id, ...(d.data() as Livro) }))),
      (e) => Alert.alert("Erro", e.message));
  }, [role]);

  const entrar = async () => {
    if (usuario === "admin" && senha === "4321") return setRole("admin");
    try { await signInWithEmailAndPassword(auth, usuario.trim(), senha); }
    catch { Alert.alert("Erro", "Usuário ou senha inválidos"); }
  };

  const criarConta = async () => {
    try { await createUserWithEmailAndPassword(auth, usuario.trim(), senha); }
    catch (e: any) { Alert.alert("Erro", e.message); }
  };

  const sair = async () => { await signOut(auth); setRole(null); setUsuario(""); setSenha(""); setLivros([]); };

  const salvar = async () => {
    if (campos.some((c) => !form[c].trim()) || isNaN(+form.ano) || isNaN(+form.paginas))
      return Alert.alert("Erro", "Preencha todos os campos (ano e páginas numéricos)");
    const dados = { ...form, ano: +form.ano, paginas: +form.paginas };
    try {
      if (editId) await updateDoc(doc(db, "livros", editId), dados);
      else await addDoc(collection(db, "livros"), dados);
      setForm(vazio); setEditId(null);
    } catch (e: any) { Alert.alert("Erro", e.message); }
  };

  const editar = (l: Livro) => {
    setEditId(l.id!);
    setForm({ nome: l.nome, ano: String(l.ano), escritor: l.escritor, editora: l.editora, genero: l.genero, paginas: String(l.paginas) });
  };

  const remover = (id: string) =>
    Alert.alert("Remover", "Deseja remover este livro?", [
      { text: "Cancelar" },
      { text: "Remover", onPress: () => deleteDoc(doc(db, "livros", id)).catch((e) => Alert.alert("Erro", e.message)) },
    ]);

  if (carregando) return <SafeAreaView style={{ flex: 1, justifyContent: "center" }}><Text style={{ textAlign: "center" }}>Carregando...</Text></SafeAreaView>;

  if (!role)
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center" }}>📚 Biblioteca</Text>
        <TextInput style={input} placeholder="Usuário (ou e-mail)" autoCapitalize="none" value={usuario} onChangeText={setUsuario} />
        <TextInput style={input} placeholder="Senha" secureTextEntry value={senha} onChangeText={setSenha} />
        <Button title="Entrar" onPress={entrar} />
        <View style={{ height: 8 }} />
        <Button title="Criar conta (e-mail, senha mín. 6)" onPress={criarConta} />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Livros ({role === "admin" ? "Admin" : "Usuário"})</Text>
        <Button title="Sair" onPress={sair} />
      </View>

      {role === "admin" && (
        <View style={{ marginVertical: 8 }}>
          {campos.map((c) => (
            <TextInput key={c} style={input} placeholder={c} value={form[c]}
              keyboardType={c === "ano" || c === "paginas" ? "numeric" : "default"}
              onChangeText={(t) => setForm({ ...form, [c]: t })} />
          ))}
          <Button title={editId ? "Salvar alteração" : "Cadastrar livro"} onPress={salvar} />
          {editId && <Button title="Cancelar edição" onPress={() => { setEditId(null); setForm(vazio); }} />}
        </View>
      )}

      <FlatList
        data={livros}
        keyExtractor={(l) => l.id!}
        ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 20 }}>Nenhum livro cadastrado.</Text>}
        renderItem={({ item: l }) => (
          <View style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginVertical: 4 }}>
            <Text style={{ fontWeight: "bold" }}>{l.nome} ({l.ano})</Text>
            <Text>Escritor: {l.escritor}</Text>
            <Text>Editora: {l.editora}</Text>
            <Text>Gênero: {l.genero}</Text>
            <Text>Páginas: {l.paginas}</Text>
            {role === "admin" && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Button title="Editar" onPress={() => editar(l)} />
                <Button title="Remover" color="red" onPress={() => remover(l.id!)} />
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}