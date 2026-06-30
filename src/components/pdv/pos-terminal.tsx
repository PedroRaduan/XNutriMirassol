"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Barcode,
  CreditCard,
  Eraser,
  Loader2,
  Minus,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  WalletCards,
  X,
} from "lucide-react";
import { finalizePOSSale } from "@/lib/actions/pos";
import { formatCurrency } from "@/lib/utils";

type ProductRow = {
  id: string;
  productId: string;
  variantId: string | null;
  displayName: string;
  sku: string;
  barcode: string | null;
  ean: string | null;
  internalCode: string | null;
  category: string;
  imageUrl: string | null;
  price: number;
  stock: number;
  lowStock: boolean;
  exact?: boolean;
};

type CustomerRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  document: string | null;
};

type CartItem = ProductRow & {
  quantity: number;
  discount: number;
};

type PaymentMethod = "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD" | "MERCADO_PAGO";

type PaymentLine = {
  id: string;
  method: PaymentMethod;
  amount: number;
  amountReceived?: number;
};

const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  MERCADO_PAGO: "Mercado Pago",
};

const methodIcons: Record<PaymentMethod, typeof Banknote> = {
  CASH: Banknote,
  PIX: QrCode,
  DEBIT_CARD: CreditCard,
  CREDIT_CARD: CreditCard,
  MERCADO_PAGO: WalletCards,
};

const demoProducts: ProductRow[] = [
  {
    id: "demo-creatina",
    productId: "demo-creatina",
    variantId: "demo-creatina-300",
    displayName: "Creatina XNutri 300g",
    sku: "PDV-CREATINA-300",
    barcode: "7890000000011",
    ean: "7890000000011",
    internalCode: "CX-001",
    category: "Suplementos",
    imageUrl: null,
    price: 89.9,
    stock: 18,
    lowStock: false,
  },
  {
    id: "demo-legging",
    productId: "demo-legging",
    variantId: "demo-legging-m",
    displayName: "Legging Compression XNutri - M",
    sku: "PDV-LEGGING-M",
    barcode: "7890000000028",
    ean: "7890000000028",
    internalCode: "RF-002",
    category: "Roupas Fitness",
    imageUrl: null,
    price: 119.9,
    stock: 7,
    lowStock: false,
  },
];

function money(value: number) {
  return formatCurrency(Number.isFinite(value) ? value : 0);
}

function round(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function paymentId() {
  return Math.random().toString(36).slice(2, 10);
}

export function POSTerminal({
  sessionId,
  cashierName,
  expectedAmount,
  isDemo = false,
}: {
  sessionId: string;
  cashierName: string;
  expectedAmount: number;
  isDemo?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductRow[]>(isDemo ? demoProducts : []);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [generalDiscount, setGeneralDiscount] = useState(0);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [quickCustomer, setQuickCustomer] = useState({ name: "", phone: "", document: "", email: "" });
  const [payments, setPayments] = useState<PaymentLine[]>([{ id: paymentId(), method: "PIX", amount: 0 }]);
  const [message, setMessage] = useState<{ type: "ok" | "error" | "info"; text: string } | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const discountRef = useRef<HTMLInputElement | null>(null);

  const subtotal = useMemo(() => round(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)), [cart]);
  const itemDiscount = useMemo(() => round(cart.reduce((sum, item) => sum + item.discount, 0)), [cart]);
  const safeGeneralDiscount = round(Math.min(generalDiscount, Math.max(subtotal - itemDiscount, 0)));
  const total = round(Math.max(subtotal - itemDiscount - safeGeneralDiscount, 0));
  const cashLine = payments.find((payment) => payment.method === "CASH");
  const cashChange = cashLine ? round(Math.max((cashLine.amountReceived ?? cashLine.amount) - cashLine.amount, 0)) : 0;
  const visibleProducts = useMemo(() => {
    if (!isDemo) return products;
    const normalized = query.trim().toLowerCase();
    return normalized
      ? demoProducts.filter((product) =>
          [product.displayName, product.sku, product.barcode, product.ean, product.internalCode].some((value) => value?.toLowerCase().includes(normalized)),
        )
      : demoProducts;
  }, [isDemo, products, query]);
  const visibleCustomers = !isDemo && customerQuery.trim().length >= 2 ? customers : [];

  useEffect(() => {
    if (isDemo) {
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const response = await fetch(`/api/pdv/products?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = (await response.json()) as { products: ProductRow[]; exactCount: number };
        setProducts(data.products);
      } catch {
        if (!controller.signal.aborted) setMessage({ type: "error", text: "Nao foi possivel buscar produtos." });
      } finally {
        if (!controller.signal.aborted) setLoadingProducts(false);
      }
    }, query ? 180 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [query, isDemo]);

  useEffect(() => {
    if (isDemo || customerQuery.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/pdv/customers?q=${encodeURIComponent(customerQuery)}`, { signal: controller.signal });
        const data = (await response.json()) as { customers: CustomerRow[] };
        setCustomers(data.customers);
      } catch {
        if (!controller.signal.aborted) setCustomers([]);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [customerQuery, isDemo]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPayments((current) => {
        if (current.length !== 1) return current;
        return [{ ...current[0], amount: total, amountReceived: current[0].method === "CASH" ? Math.max(current[0].amountReceived ?? total, total) : undefined }];
      });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [total]);

  function addToCart(product: ProductRow) {
    if (product.stock <= 0) {
      setMessage({ type: "error", text: `${product.displayName} esta sem estoque.` });
      return;
    }

    const currentItem = cart.find((item) => item.id === product.id);
    if (currentItem && currentItem.quantity >= product.stock) {
      setMessage({ type: "error", text: `Estoque maximo de ${product.stock} unidade(s) para ${product.displayName}.` });
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item));
      }
      return [...current, { ...product, quantity: 1, discount: 0 }];
    });
    setReceiptUrl(null);
    setMessage({ type: "ok", text: `${product.displayName} adicionado.` });
  }

  function updateCart(id: string, data: Partial<Pick<CartItem, "quantity" | "discount">>) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const quantity = data.quantity === undefined ? item.quantity : Math.max(1, Math.min(data.quantity, Math.max(item.stock, 1)));
        const maxDiscount = item.price * quantity;
        const discount = data.discount === undefined ? item.discount : Math.max(0, Math.min(data.discount, maxDiscount));
        return { ...item, quantity, discount: round(discount) };
      }),
    );
  }

  async function addFirstSearchResult(rawLookup = query) {
    const lookup = rawLookup.trim();

    if (isDemo) {
      const normalized = lookup.toLowerCase();
      const product = normalized
        ? demoProducts.find((item) =>
            [item.displayName, item.sku, item.barcode, item.ean, item.internalCode].some((value) => value?.toLowerCase() === normalized),
          ) ?? visibleProducts[0]
        : visibleProducts[0];
      if (product) {
        addToCart(product);
        setQuery("");
      }
      return;
    }

    if (!lookup) {
      const product = visibleProducts[0];
      if (product) addToCart(product);
      return;
    }

    setLoadingProducts(true);
    try {
      const response = await fetch(`/api/pdv/products?q=${encodeURIComponent(lookup)}`);
      if (!response.ok) throw new Error("Busca indisponivel.");
      const data = (await response.json()) as { products: ProductRow[]; exactCount: number };
      setProducts(data.products);
      const exact = data.exactCount === 1 ? data.products.find((product) => product.exact) : null;
      const singleResult = data.products.length === 1 ? data.products[0] : null;
      const product = exact ?? singleResult;

      if (!product) {
        setMessage({
          type: "error",
          text: data.products.length > 1 ? "Mais de um produto encontrado. Escolha a variacao correta." : "Produto nao encontrado.",
        });
        return;
      }

      addToCart(product);
      setQuery("");
    } catch {
      setMessage({ type: "error", text: "Nao foi possivel buscar este codigo agora." });
    } finally {
      setLoadingProducts(false);
    }
  }

  function setSinglePayment(method: PaymentMethod) {
    setPayments([{ id: paymentId(), method, amount: total, amountReceived: method === "CASH" ? total : undefined }]);
  }

  function addPaymentLine() {
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    setPayments((current) => [...current, { id: paymentId(), method: "CASH", amount: Math.max(round(total - paid), 0) }]);
  }

  async function submitSale() {
    if (isDemo) {
      setMessage({ type: "info", text: "Modo demo sem banco: a tela simula a venda, mas nao grava estoque nem relatorios." });
      return;
    }
    if (cart.length === 0) {
      setMessage({ type: "error", text: "Adicione pelo menos um produto." });
      return;
    }
    const validPayments = payments.filter((payment) => payment.amount > 0);
    const paid = round(validPayments.reduce((sum, payment) => sum + payment.amount, 0));
    if (Math.abs(paid - total) > 0.01) {
      setMessage({ type: "error", text: "A soma dos pagamentos precisa bater com o total." });
      return;
    }

    const soldItems = cart.map((item) => ({ id: item.id, quantity: item.quantity }));

    startTransition(async () => {
      const response = await finalizePOSSale({
        sessionId,
        customerId: selectedCustomer?.id,
        customer: selectedCustomer ? undefined : quickCustomer,
        generalDiscount: safeGeneralDiscount,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          discount: item.discount,
        })),
        payments: validPayments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          amountReceived: payment.method === "CASH" ? payment.amountReceived ?? payment.amount : undefined,
        })),
      });

      setMessage({ type: response.ok ? "ok" : "error", text: response.message });
      if (response.ok) {
        setCart([]);
        setGeneralDiscount(0);
        setPayments([{ id: paymentId(), method: "PIX", amount: 0 }]);
        setProducts((current) =>
          current.map((product) => {
            const sold = soldItems.find((item) => item.id === product.id);
            return sold ? { ...product, stock: Math.max(product.stock - sold.quantity, 0), lowStock: product.stock - sold.quantity <= 5 } : product;
          }),
        );
        setSelectedCustomer(null);
        setCustomerQuery("");
        setQuickCustomer({ name: "", phone: "", document: "", email: "" });
        setReceiptUrl(response.receiptUrl ?? null);
        router.refresh();
      }
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "F4") {
        event.preventDefault();
        discountRef.current?.focus();
      }
      if (event.key === "F8") {
        event.preventDefault();
        void submitSale();
      }
      if (event.key === "Escape") {
        setQuery("");
        setMessage(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_440px]">
      <section className="grid gap-4">
        <div className="surface overflow-hidden">
          <div className="border-b border-white/10 bg-gradient-to-br from-[#111216] via-[#251315] to-[#f2382f] p-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">PDV XNutri</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">Venda presencial</h1>
                <p className="mt-1 text-sm font-semibold text-white/78">Caixa: {cashierName}</p>
              </div>
              <Link className="btn border border-white/20 bg-white/10 text-white hover:bg-white/15" href="/pdv/relatorios">
                <ReceiptText size={18} />
                Relatorios
              </Link>
            </div>
          </div>

          <div className="grid gap-3 p-4">
            <label className="text-sm font-black">
              Buscar produto, SKU ou codigo de barras
              <div className="field mt-2 flex min-h-14 items-center gap-3 border-2 text-lg">
                <Barcode className="text-[var(--brand)]" size={24} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addFirstSearchResult(event.currentTarget.value);
                    }
                  }}
                  className="w-full bg-transparent font-black outline-none"
                  placeholder="Escaneie ou digite..."
                  autoFocus
                />
                {loadingProducts && <Loader2 className="animate-spin text-[var(--muted)]" size={20} />}
              </div>
            </label>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="group grid grid-cols-[64px_1fr] gap-3 rounded-lg border border-[var(--line)] bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffb5aa] hover:shadow-lg"
                >
                  <span className="grid aspect-square place-items-center overflow-hidden rounded-md bg-[#f1f2f4] text-[var(--brand)]">
                    {product.imageUrl ? <Image src={product.imageUrl} alt="" width={64} height={64} className="h-full w-full object-cover" /> : <ShoppingCart size={24} />}
                  </span>
                  <span className="min-w-0">
                    <strong className="line-clamp-2 text-sm leading-5">{product.displayName}</strong>
                    <span className="mt-1 block truncate text-xs font-bold text-[var(--muted)]">{product.sku}</span>
                    <span className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-base font-black text-[var(--brand)]">{money(product.price)}</span>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-black ${product.lowStock ? "bg-[#fff1ef] text-[var(--brand-dark)]" : "bg-[#edf8f1] text-green-700"}`}>
                        {product.stock}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Carrinho da venda</h2>
              <p className="text-sm font-semibold text-[var(--muted)]">{cart.length} item(ns) na venda</p>
            </div>
            <button type="button" className="btn btn-secondary px-3" onClick={() => setCart([])}>
              <Eraser size={16} />
              Limpar
            </button>
          </div>

          <div className="grid gap-2">
            {cart.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-lg border border-[var(--line)] bg-[#fafafa] p-3 sm:grid-cols-[1fr_130px_130px_auto] sm:items-center">
                <div className="min-w-0">
                  <strong className="block truncate">{item.displayName}</strong>
                  <span className="text-xs font-bold text-[var(--muted)]">{item.sku} - estoque {item.stock}</span>
                  <span className="mt-1 block text-sm font-black text-[var(--brand)]">{money(item.price)}</span>
                </div>
                <div className="flex items-center rounded-lg border border-[var(--line)] bg-white">
                  <button type="button" className="grid size-10 place-items-center" onClick={() => updateCart(item.id, { quantity: item.quantity - 1 })}>
                    <Minus size={15} />
                  </button>
                  <input
                    className="w-12 bg-transparent text-center font-black outline-none"
                    value={item.quantity}
                    onChange={(event) => updateCart(item.id, { quantity: Number(event.target.value) || 1 })}
                  />
                  <button type="button" className="grid size-10 place-items-center" onClick={() => updateCart(item.id, { quantity: item.quantity + 1 })}>
                    <Plus size={15} />
                  </button>
                </div>
                <label className="text-xs font-black uppercase text-[var(--muted)]">
                  Desconto item
                  <input className="field mt-1" type="number" min={0} step="0.01" value={item.discount} onChange={(event) => updateCart(item.id, { discount: Number(event.target.value) || 0 })} />
                </label>
                <button type="button" className="grid size-10 place-items-center rounded-md text-red-700 hover:bg-red-50" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="rounded-lg border border-dashed border-[var(--line)] p-8 text-center text-sm font-semibold text-[var(--muted)]">
                Use o campo de busca ou o leitor para adicionar produtos.
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <section className="surface p-4">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-[var(--brand)]" />
            <h2 className="text-lg font-black">Cliente</h2>
          </div>
          {selectedCustomer ? (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <strong>{selectedCustomer.name ?? selectedCustomer.email}</strong>
                  <p className="text-green-800">{selectedCustomer.phone ?? selectedCustomer.email}</p>
                </div>
                <button type="button" onClick={() => setSelectedCustomer(null)} className="text-green-900">
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              <input className="field" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Nome, telefone, CPF ou e-mail" />
              {visibleCustomers.map((customer) => (
                <button key={customer.id} type="button" onClick={() => setSelectedCustomer(customer)} className="rounded-md border border-[var(--line)] bg-white p-2 text-left text-sm hover:border-[#ffb5aa]">
                  <strong>{customer.name ?? customer.email}</strong>
                  <span className="block text-xs text-[var(--muted)]">{customer.phone ?? customer.email}</span>
                </button>
              ))}
              <details className="rounded-lg border border-[var(--line)] bg-[#fafafa] p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-black">
                  <UserPlus size={16} />
                  Cadastro rapido
                </summary>
                <div className="mt-3 grid gap-2">
                  <input className="field" value={quickCustomer.name} onChange={(event) => setQuickCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Nome" />
                  <input className="field" value={quickCustomer.phone} onChange={(event) => setQuickCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefone" />
                  <input className="field" value={quickCustomer.document} onChange={(event) => setQuickCustomer((current) => ({ ...current, document: event.target.value }))} placeholder="CPF opcional" />
                  <input className="field" value={quickCustomer.email} onChange={(event) => setQuickCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="E-mail opcional" />
                </div>
              </details>
            </div>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="text-lg font-black">Pagamento</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(Object.keys(methodLabels) as PaymentMethod[]).map((method) => {
              const Icon = methodIcons[method];
              return (
                <button key={method} type="button" onClick={() => setSinglePayment(method)} className="btn btn-secondary min-h-12 justify-start px-3">
                  <Icon size={17} />
                  {methodLabels[method]}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2">
            {payments.map((payment) => (
              <div key={payment.id} className="grid gap-2 rounded-lg border border-[var(--line)] bg-[#fafafa] p-2">
                <div className="grid grid-cols-[1fr_120px_auto] gap-2">
                  <select
                    className="field"
                    value={payment.method}
                    onChange={(event) =>
                      setPayments((current) =>
                        current.map((entry) => (entry.id === payment.id ? { ...entry, method: event.target.value as PaymentMethod, amountReceived: undefined } : entry)),
                      )
                    }
                  >
                    {(Object.keys(methodLabels) as PaymentMethod[]).map((method) => <option key={method} value={method}>{methodLabels[method]}</option>)}
                  </select>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={payment.amount}
                    onChange={(event) => setPayments((current) => current.map((entry) => (entry.id === payment.id ? { ...entry, amount: Number(event.target.value) || 0 } : entry)))}
                  />
                  <button type="button" className="grid size-11 place-items-center rounded-md text-red-700 hover:bg-red-50" onClick={() => setPayments((current) => current.filter((entry) => entry.id !== payment.id))}>
                    <Trash2 size={17} />
                  </button>
                </div>
                {payment.method === "CASH" && (
                  <label className="text-xs font-black uppercase text-[var(--muted)]">
                    Valor recebido
                    <input
                      className="field mt-1"
                      type="number"
                      min={0}
                      step="0.01"
                      value={payment.amountReceived ?? payment.amount}
                      onChange={(event) => setPayments((current) => current.map((entry) => (entry.id === payment.id ? { ...entry, amountReceived: Number(event.target.value) || 0 } : entry)))}
                    />
                  </label>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary min-h-11" onClick={addPaymentLine}>
              <Plus size={16} />
              Pagamento misto
            </button>
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="text-lg font-black">Resumo</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="flex justify-between"><span>Descontos itens</span><strong>- {money(itemDiscount)}</strong></div>
            <label className="grid gap-1 text-xs font-black uppercase text-[var(--muted)]">
              Desconto geral
              <input ref={discountRef} className="field" type="number" min={0} step="0.01" value={generalDiscount} onChange={(event) => setGeneralDiscount(Number(event.target.value) || 0)} />
            </label>
            <div className="flex justify-between border-t border-[var(--line)] pt-3 text-xl"><span>Total</span><strong className="text-[var(--brand)]">{money(total)}</strong></div>
            {cashLine && <div className="rounded-md bg-[#f6f7f9] p-2 font-black">Troco: {money(cashChange)}</div>}
            <div className="rounded-md bg-[#f6f7f9] p-2 text-xs font-semibold text-[var(--muted)]">Dinheiro esperado no caixa: {money(expectedAmount)}</div>
          </div>

          {message && (
            <p className={`mt-3 rounded-md border p-3 text-sm font-bold ${message.type === "ok" ? "border-green-200 bg-green-50 text-green-700" : message.type === "info" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              {message.text}
            </p>
          )}

          <button type="button" className="btn btn-primary mt-4 min-h-14 w-full text-base" disabled={isPending || total <= 0} onClick={() => void submitSale()}>
            {isPending ? <Loader2 className="animate-spin" size={19} /> : <ReceiptText size={19} />}
            {isPending ? "Finalizando..." : "Finalizar venda"}
          </button>
          {receiptUrl && (
            <Link href={receiptUrl} className="btn btn-secondary mt-2 w-full" target="_blank">
              <Printer size={17} />
              Abrir comprovante
            </Link>
          )}
        </section>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ffd8d1] bg-white/95 p-3 shadow-2xl backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-[var(--muted)]">Total</p>
            <strong className="text-xl text-[var(--brand)]">{money(total)}</strong>
          </div>
          <button type="button" className="btn btn-primary min-h-12 px-5" disabled={isPending || total <= 0} onClick={() => void submitSale()}>
            F8 Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}
