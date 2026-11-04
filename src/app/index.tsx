import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";
import {
  addDoc,
  collection,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  serverTimestamp,
  where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "./firebaseConfig";

interface Transacao {
  id: string;
  tipo: "RECEITA" | "DESPESA";
  valor: number;
  observacao: string;
  data: string;
}

export default function AppFinanceiro() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [email, setEmail] = useState<string>("");
  const [senha, setSenha] = useState<string>("");
  const [modoCadastro, setModoCadastro] = useState<boolean>(false);

  // Estados do app financeiro
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [saldo, setSaldo] = useState<number>(0);
  
  // Estados para nova transação
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("RECEITA");
  const [valor, setValor] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [dataTransacao, setDataTransacao] = useState<string>("");

  // Monitorar autenticação do usuário
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      setUsuario(user);
    });
    return () => unsub();
  }, []);

  // Carregar transações do usuário logado ordenadas por data
  useEffect(() => {
    if (!usuario) {
      setTransacoes([]);
      setSaldo(0);
      return;
    }

    const q = query(
      collection(db, "transacoes_financeiras"),
      where("uid", "==", usuario.uid),
      orderBy("data", "asc")
    );

    const unsub = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      let lista: Transacao[] = [];
      let saldoTotal = 0;

      snapshot.docs.forEach((doc) => {
        const dados = doc.data() as Omit<Transacao, "id">;
        lista.push({
          id: doc.id,
          tipo: dados.tipo,
          valor: dados.valor,
          observacao: dados.observacao,
          data: dados.data,
        });

        if (dados.tipo === "RECEITA") {
          saldoTotal += Number(dados.valor);
        } else {
          saldoTotal -= Number(dados.valor);
        }
      });

      setTransacoes(lista);
      setSaldo(saldoTotal);
    });

    return () => unsub();
  }, [usuario]);

  const handleAutenticacao = async () => {
    if (!email || !senha) {
      Alert.alert("Erro", "Preencha o e-mail e a senha.");
      return;
    }

    try {
      if (modoCadastro) {
        await createUserWithEmailAndPassword(auth, email, senha);
        Alert.alert("Sucesso", "Conta criada com sucesso!");
      } else {
        await signInWithEmailAndPassword(auth, email, senha);
      }
    } catch (error: any) {
      Alert.alert("Erro de Autenticação", error.message);
    }
  };

  const adicionarTransacao = async () => {
    if (!usuario) return;

    const valorNumerico = parseFloat(valor.replace(",", "."));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      Alert.alert("Aviso", "Informe um valor válido.");
      return;
    }
    if (!observacao.trim()) {
      Alert.alert("Aviso", "Informe uma observação.");
      return;
    }
    if (!dataTransacao.trim()) {
      Alert.alert("Aviso", "Informe a data (ex: 2026-06-06).");
      return;
    }

    try {
      await addDoc(collection(db, "transacoes_financeiras"), {
        uid: usuario.uid,
        tipo,
        valor: valorNumerico,
        observacao: observacao.trim(),
        data: dataTransacao.trim(),
        criadoEm: serverTimestamp(),
      });

      setValor("");
      setObservacao("");
      setDataTransacao("");
      Alert.alert("Sucesso", "Lançamento efetuado!");
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar a transação.");
    }
  };

  // Se não estiver autenticado, exibe a tela de Login/Cadastro
  if (!usuario) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.titulo}>💰 Minhas Finanças</Text>
        
        <View style={styles.bloco}>
          <Text style={styles.label}>E-mail:</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor="#888"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Senha:</Text>
          <TextInput
            style={styles.input}
            placeholder="Sua senha"
            placeholderTextColor="#888"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />

          <TouchableOpacity style={styles.botao} onPress={handleAutenticacao}>
            <Text style={styles.textoBotao}>{modoCadastro ? "Cadastrar" : "Entrar"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModoCadastro(!modoCadastro)}>
            <Text style={styles.textoAlternar}>
              {modoCadastro ? "Já tem uma conta? Faça login" : "Não tem conta? Cadastre-se"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Tela principal do Controle Financeiro
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.cabecalho}>
        <Text style={styles.tituloApp}>💳 Conta Corrente Pessoal</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={styles.textoSair}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.painelSaldo}>
        <Text style={styles.labelSaldo}>Saldo Atual:</Text>
        <Text style={[styles.valorSaldo, { color: saldo >= 0 ? "#22C55E" : "#EF4444" }]}>
          R$ {saldo.toFixed(2)}
        </Text>
      </View>

      <View style={styles.formulario}>
        <Text style={styles.subtitulo}>Novo Lançamento</Text>
        
        <View style={styles.seletorTipo}>
          <TouchableOpacity
            style={[styles.botaoTipo, tipo === "RECEITA" && styles.receitaAtiva]}
            onPress={() => setTipo("RECEITA")}
          >
            <Text style={styles.textoBotaoTipo}>Receita (+)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botaoTipo, tipo === "DESPESA" && styles.despesaAtiva]}
            onPress={() => setTipo("DESPESA")}
          >
            <Text style={styles.textoBotaoTipo}>Despesa (-)</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Valor (Ex: 150.00)"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={valor}
          onChangeText={setValor}
        />
        <TextInput
          style={styles.input}
          placeholder="Observação (Ex: Salário, Supermercado)"
          placeholderTextColor="#888"
          value={observacao}
          onChangeText={setObservacao}
        />
        <TextInput
          style={styles.input}
          placeholder="Data (Ex: 2026-06-06)"
          placeholderTextColor="#888"
          value={dataTransacao}
          onChangeText={setDataTransacao}
        />

        <TouchableOpacity style={styles.botao} onPress={adicionarTransacao}>
          <Text style={styles.textoBotao}>Lançar Valor</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitulo}>Extrato da Conta</Text>
      <FlatList
        data={transacoes}
        keyExtractor={(item: Transacao) => item.id}
        renderItem={({ item }: { item: Transacao }) => (
          <View style={styles.itemExtrato}>
            <View>
              <Text style={styles.obsExtrato}>{item.observacao}</Text>
              <Text style={styles.dataExtrato}>{item.data}</Text>
            </View>
            <Text style={[styles.valorExtrato, { color: item.tipo === "RECEITA" ? "#22C55E" : "#EF4444" }]}>
              {item.tipo === "RECEITA" ? `+ R$ ${item.valor.toFixed(2)}` : `- R$ ${item.valor.toFixed(2)}`}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    padding: 16,
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#38BDF8",
    textAlign: "center",
    marginVertical: 20,
  },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tituloApp: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#38BDF8",
  },
  textoSair: {
    color: "#EF4444",
    fontWeight: "bold",
  },
  bloco: {
    width: "100%",
    marginTop: 20,
  },
  label: {
    color: "#FFF",
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1F2937",
    color: "#FFF",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#374151",
  },
  botao: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  textoBotao: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  textoAlternar: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 10,
  },
  painelSaldo: {
    backgroundColor: "#1F2937",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#374151",
  },
  labelSaldo: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  valorSaldo: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 4,
  },
  formulario: {
    marginBottom: 15,
  },
  subtitulo: {
    color: "#F3F4F6",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  seletorTipo: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  botaoTipo: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
  },
  receitaAtiva: {
    backgroundColor: "#065F46",
    borderColor: "#22C55E",
  },
  despesaAtiva: {
    backgroundColor: "#7F1D1D",
    borderColor: "#EF4444",
  },
  textoBotaoTipo: {
    color: "#FFF",
    fontWeight: "bold",
  },
  itemExtrato: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
  },
  obsExtrato: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  dataExtrato: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  valorExtrato: {
    fontSize: 16,
    fontWeight: "bold",
  },
});