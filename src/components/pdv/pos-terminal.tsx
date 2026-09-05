"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Barcode,
  CheckCircle2,
  CreditCard,
  Eraser,
  Loader2,
  Minus,
  PackageSearch,
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
import type { ReactNode } from "react";
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

type PaymentMethod = "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD" | "PAGBANK";

type PaymentLine = {
  id: string;
  method: PaymentMethod;
  amount: number;
  amountReceived?: number;
};

const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  PAGBANK: "PagBank",
};

const paymentMethodList = Object.keys(methodLabels) as PaymentMethod[];

const methodIcons: Record<PaymentMethod, typeof Banknote> = {
  CASH: Banknote,
  PIX: QrCode,
  DEBIT_CARD: CreditCard,
  CREDIT_CARD: CreditCard,
  PAGBANK: WalletCards,
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
    variantId: "demo-legging-grafite",
    displayName: "Legging Compression XNutri Grafite",
    sku: "PDV-LEGGING-GRAFITE",
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
  sessionTools,
}: {
  sessionId: string;
  cashierName: string;
  expectedAmount: number;
  isDemo?: boolean;
  sessionTools?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [products, setProducts] = useState<ProductRow[]>(isDemo ? demoProducts : []);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [generalDiscount, setGeneralDiscount] = useState(0);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [quickCustomer, setQuickCustomer] = useState({ name: "", phone: "", document: "", email: "" });
  const [quickCustomerApplied, setQuickCustomerApplied] = useState(false);
  const [payments, setPayments] = useState<PaymentLine[]>([{ id: paymentId(), method: "PIX", amount: 0 }]);
  const [message, setMessage] = useState<{ type: "ok" | "error" | "info"; text: string } | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const customerRef = useRef<HTMLInputElement | null>(null);
  const discountRef = useRef<HTMLInputElement | null>(null);
  const quickCustomerDialogRef = useRef<HTMLDialogElement | null>(null);
  const clearSaleDialogRef = useRef<HTMLDialogElement | null>(null);
  const submittingRef = useRef(false);
  const saleRequestIdRef = useRef<string | null>(null);

  const subtotal = useMemo(() => round(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)), [cart]);
  const itemDiscount = useMemo(() => round(cart.reduce((sum, item) => sum + item.discount, 0)), [cart]);
  const safeGeneralDiscount = round(Math.min(generalDiscount, Math.max(subtotal - itemDiscount, 0)));
  const total = round(Math.max(subtotal - itemDiscount - safeGeneralDiscount, 0));
  const cashLine = payments.find((payment) => payment.method === "CASH");
  const cashChange = cashLine ? round(Math.max((cashLine.amountReceived ?? cashLine.amount) - cashLine.amount, 0)) : 0;
  const paymentTotal = useMemo(() => round(payments.reduce((sum, payment) => sum + payment.amount, 0)), [payments]);
  const remainingPayment = round(Math.max(total - paymentTotal, 0));
  const canAddPaymentLine = total > 0 && !isPending && payments.length < paymentMethodList.length && (remainingPayment > 0.01 || payments.length === 1);
  const productCategories = useMemo(
    () => ["Todas", ...Array.from(new Set(products.map((product) => product.category))).sort((left, right) => left.localeCompare(right, "pt-BR"))],
    [products],
  );
  const activeCategory = productCategories.includes(category) ? category : "Todas";
  const visibleProducts = useMemo(() => {
    const source = !isDemo
      ? products
      : (() => {
          const normalized = query.trim().toLowerCase();
          return normalized
            ? demoProducts.filter((product) =>
                [product.displayName, product.sku, product.barcode, product.ean, product.internalCode].some((value) =>
                  value?.toLowerCase().includes(normalized),
                ),
              )
            : demoProducts;
        })();

    return activeCategory === "Todas" ? source : source.filter((product) => product.category === activeCategory);
  }, [activeCategory, isDemo, products, query]);
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
        if (!response.ok) throw new Error("Busca indisponível.");
        const data = (await response.json()) as { products: ProductRow[]; exactCount: number };
        setProducts(data.products);
      } catch {
        if (!controller.signal.aborted) setMessage({ type: "error", text: "Não foi possível buscar produtos." });
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
      setLoadingCustomers(true);
      setCustomerError("");
      try {
        const response = await fetch(`/api/pdv/customers?q=${encodeURIComponent(customerQuery)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Busca indisponível.");
        const data = (await response.json()) as { customers: CustomerRow[] };
        if (!controller.signal.aborted) setCustomers(data.customers);
      } catch {
        if (!controller.signal.aborted) {
          setCustomers([]);
          setCustomerError("Não foi possível buscar clientes. Verifique a conexão e tente novamente.");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingCustomers(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [customerQuery, isDemo]);

  useEffect(() => {
    if (!message) return;
    const handle = window.setTimeout(() => setMessage(null), message.type === "error" ? 6000 : 3600);
    return () => window.clearTimeout(handle);
  }, [message]);

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
      setMessage({ type: "error", text: `${product.displayName} está sem estoque.` });
      return;
    }

    const currentItem = cart.find((item) => item.id === product.id);
    if (currentItem && currentItem.quantity >= product.stock) {
      setMessage({ type: "error", text: `Estoque máximo de ${product.stock} unidade(s) para ${product.displayName}.` });
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
      if (!response.ok) throw new Error("Busca indisponível.");
      const data = (await response.json()) as { products: ProductRow[]; exactCount: number };
      setProducts(data.products);
      const exact = data.exactCount === 1 ? data.products.find((product) => product.exact) : null;
      const singleResult = data.products.length === 1 ? data.products[0] : null;
      const product = exact ?? singleResult;

      if (!product) {
        setMessage({
          type: "error",
          text: data.products.length > 1 ? "Mais de um produto encontrado. Escolha a variação correta." : "Produto não encontrado.",
        });
        return;
      }

      addToCart(product);
      setQuery("");
    } catch {
      setMessage({ type: "error", text: "Não foi possível buscar este código agora." });
    } finally {
      setLoadingProducts(false);
    }
  }

  function setSinglePayment(method: PaymentMethod) {
    setPayments([{ id: paymentId(), method, amount: total, amountReceived: method === "CASH" ? total : undefined }]);
  }

  function addPaymentLine() {
    if (total <= 0) {
      setMessage({ type: "error", text: "Adicione produtos antes de dividir o pagamento." });
      return;
    }

    if (payments.length >= paymentMethodList.length) {
      setMessage({ type: "error", text: "Limite de formas de pagamento atingido para esta venda." });
      return;
    }

    const paid = round(payments.reduce((sum, payment) => sum + payment.amount, 0));

    if (paid > total + 0.01) {
      setMessage({ type: "error", text: "A soma dos pagamentos já passou do total. Ajuste os valores antes de adicionar outra forma." });
      return;
    }

    if (paid >= total - 0.01 && payments.length > 1) {
      setMessage({ type: "info", text: "O total já está dividido. Ajuste os valores existentes se quiser mudar o pagamento misto." });
      return;
    }

    if (paid >= total - 0.01 && payments.length === 1) {
      const firstPayment = payments[0];
      const firstAmount = round(total / 2);
      const secondAmount = round(total - firstAmount);
      const secondMethod: PaymentMethod = firstPayment.method === "CASH" ? "PIX" : "CASH";

      setPayments([
        {
          ...firstPayment,
          amount: firstAmount,
          amountReceived: firstPayment.method === "CASH" ? Math.max(firstPayment.amountReceived ?? firstAmount, firstAmount) : undefined,
        },
        {
          id: paymentId(),
          method: secondMethod,
          amount: secondAmount,
          amountReceived: secondMethod === "CASH" ? secondAmount : undefined,
        },
      ]);
      setMessage({ type: "info", text: "Pagamento misto criado. Ajuste os valores se precisar." });
      return;
    }

    const usedMethods = new Set(payments.map((payment) => payment.method));
    const nextMethod = paymentMethodList.find((method) => !usedMethods.has(method)) ?? "CASH";
    const remaining = round(total - paid);

    setPayments((current) => [
      ...current,
      {
        id: paymentId(),
        method: nextMethod,
        amount: remaining,
        amountReceived: nextMethod === "CASH" ? remaining : undefined,
      },
    ]);
    setMessage({ type: "info", text: "Forma de pagamento adicionada ao valor restante." });
  }

  function removePaymentLine(id: string) {
    setPayments((current) => {
      const next = current.filter((entry) => entry.id !== id);
      return next.length > 0 ? next : [{ id: paymentId(), method: "PIX", amount: total }];
    });
  }

  function clearSale() {
    setCart([]);
    setGeneralDiscount(0);
    setPayments([{ id: paymentId(), method: "PIX", amount: 0 }]);
    setSelectedCustomer(null);
    setCustomerQuery("");
    setQuickCustomer({ name: "", phone: "", document: "", email: "" });
    setQuickCustomerApplied(false);
    setReceiptUrl(null);
    closeDialog(clearSaleDialogRef.current);
    setMessage({ type: "info", text: "Venda atual limpa. Nenhum estoque foi alterado." });
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  async function submitSale() {
    if (submittingRef.current) {
      return;
    }

    if (isDemo) {
      setMessage({ type: "info", text: "Modo de treinamento: a tela simula a venda, mas não grava estoque nem relatórios." });
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

    submittingRef.current = true;
    saleRequestIdRef.current ??= crypto.randomUUID();
    startTransition(async () => {
      try {
        const response = await finalizePOSSale({
          requestId: saleRequestIdRef.current,
          sessionId,
          customerId: selectedCustomer?.id,
          customer: selectedCustomer || !quickCustomerApplied ? undefined : quickCustomer,
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
          saleRequestIdRef.current = null;
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
          setQuickCustomerApplied(false);
          setReceiptUrl(response.receiptUrl ?? null);
          router.refresh();
        }
      } catch {
        setMessage({ type: "error", text: "Não foi possível finalizar a venda agora. Tente novamente." });
      } finally {
        submittingRef.current = false;
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
      if (event.key === "F3") {
        event.preventDefault();
        customerRef.current?.focus();
      }
      if (event.key === "F8") {
        event.preventDefault();
        void submitSale();
      }
      if (event.key === "Escape") {
        setQuery("");
        setMessage(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <>
      <div
        className="grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(280px,1.2fr)_minmax(280px,1fr)_minmax(270px,0.82fr)] lg:overflow-hidden"
        data-pdv-sale-workspace
      >
        <section className="surface flex min-h-0 flex-col overflow-hidden" aria-labelledby="pdv-products-title" data-pdv-panel="products">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[#171716] px-3 py-2.5 text-white">
            <div className="min-w-0">
              <h1 id="pdv-products-title" className="text-lg font-black leading-tight">Venda presencial</h1>
              <p className="truncate text-xs font-semibold text-white/65">Caixa: {cashierName}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {sessionTools}
              <Link
                className="btn min-h-9 border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white hover:bg-white/15"
                href="/pdv/relatorios"
                aria-label="Abrir relatórios do PDV"
              >
                <ReceiptText size={15} />
                <span className="hidden sm:inline">Relatórios</span>
              </Link>
            </div>
          </header>

          <div className="grid gap-2 border-b border-[var(--line)] p-3">
            <label className="sr-only" htmlFor="pdv-product-search">Buscar produto, SKU ou código de barras</label>
            <div className="field flex min-h-11 items-center gap-2 border-2 px-3 py-2">
              <Barcode className="shrink-0 text-[var(--brand)]" size={20} />
              <input
                id="pdv-product-search"
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addFirstSearchResult(event.currentTarget.value);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
                placeholder="Nome, SKU ou código de barras (F2)"
                autoComplete="off"
                autoFocus
              />
              {query ? (
                <button type="button" className="grid size-7 shrink-0 place-items-center rounded text-[var(--muted)] hover:bg-[#f2f1ef]" onClick={() => setQuery("")} aria-label="Limpar busca">
                  <X size={16} />
                </button>
              ) : null}
              {loadingProducts ? <Loader2 className="shrink-0 motion-safe:animate-spin text-[var(--muted)]" size={18} aria-label="Buscando produtos" /> : null}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Filtrar produtos por categoria">
              {productCategories.map((productCategory) => (
                <button
                  key={productCategory}
                  type="button"
                  onClick={() => setCategory(productCategory)}
                  aria-pressed={activeCategory === productCategory}
                  className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-bold transition ${activeCategory === productCategory ? "border-[var(--brand)] bg-[#fff1ef] text-[var(--brand-dark)]" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[#c8c4bd]"}`}
                >
                  {productCategory}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[260px] flex-1 overflow-y-auto p-3 [scrollbar-width:thin]" aria-busy={loadingProducts}>
            {loadingProducts ? (
              <ProductListSkeleton />
            ) : visibleProducts.length > 0 ? (
              <div className="grid gap-2 min-[1500px]:grid-cols-2">
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className="group grid min-h-[72px] grid-cols-[52px_1fr] gap-2.5 rounded-lg border border-[var(--line)] bg-white p-2 text-left transition hover:border-[#e7aaa5] hover:bg-[#fffafa] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="relative grid aspect-square place-items-center overflow-hidden rounded-md bg-[#f1f2f4] text-[var(--brand)]">
                      {product.imageUrl ? <Image src={product.imageUrl} alt="" fill sizes="52px" className="object-contain" /> : <ShoppingCart size={21} />}
                    </span>
                    <span className="min-w-0">
                      <strong className="line-clamp-1 text-sm leading-5">{product.displayName}</strong>
                      <span className="block truncate text-[11px] font-semibold text-[var(--muted)]">{product.sku} · {product.category}</span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-[var(--brand)]">{money(product.price)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${product.stock <= 0 ? "bg-red-50 text-red-700" : product.lowStock ? "bg-[#fff1ef] text-[var(--brand-dark)]" : "bg-[#edf8f1] text-green-700"}`}>
                          {product.stock <= 0 ? "Sem estoque" : `${product.stock} un.`}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-[var(--line)] p-6 text-center">
                <div>
                  <PackageSearch className="mx-auto text-[var(--muted)]" size={28} />
                  <p className="mt-2 text-sm font-black">Nenhum produto encontrado</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Revise a busca ou escolha outra categoria.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="surface flex min-h-0 flex-col overflow-hidden" aria-labelledby="pdv-cart-title" data-pdv-panel="cart">
          <header className="flex min-h-[58px] items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-2">
            <div>
              <h2 id="pdv-cart-title" className="font-black">Carrinho</h2>
              <p className="text-xs font-semibold text-[var(--muted)]">{cart.length} item(ns) na venda</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary min-h-9 px-2.5 py-2 text-xs"
              onClick={() => openDialog(clearSaleDialogRef.current)}
              disabled={cart.length === 0 || isPending}
            >
              <Eraser size={15} />
              Limpar
            </button>
          </header>

          <div className="min-h-[260px] flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
            {cart.length > 0 ? (
              <div className="grid gap-2">
                {cart.map((item) => (
                  <article key={item.id} className="rounded-lg border border-[var(--line)] bg-[#fafafa] p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="block truncate text-sm">{item.displayName}</strong>
                        <span className="block truncate text-[11px] font-semibold text-[var(--muted)]">{item.sku} · estoque {item.stock}</span>
                      </div>
                      <strong className="shrink-0 text-sm text-[var(--brand)]">{money(item.price * item.quantity - item.discount)}</strong>
                    </div>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <div className="flex h-9 items-center rounded-md border border-[var(--line)] bg-white">
                        <button type="button" aria-label={`Diminuir quantidade de ${item.displayName}`} className="grid size-9 place-items-center" onClick={() => updateCart(item.id, { quantity: item.quantity - 1 })} disabled={isPending}>
                          <Minus size={14} />
                        </button>
                        <input
                          aria-label={`Quantidade de ${item.displayName}`}
                          className="w-9 bg-transparent text-center text-sm font-black outline-none"
                          inputMode="numeric"
                          value={item.quantity}
                          disabled={isPending}
                          onChange={(event) => updateCart(item.id, { quantity: Number(event.target.value) || 1 })}
                        />
                        <button type="button" aria-label={`Aumentar quantidade de ${item.displayName}`} className="grid size-9 place-items-center" onClick={() => updateCart(item.id, { quantity: item.quantity + 1 })} disabled={isPending || item.quantity >= item.stock}>
                          <Plus size={14} />
                        </button>
                      </div>
                      <label className="min-w-24 flex-1 text-[10px] font-black uppercase text-[var(--muted)]">
                        Desconto
                        <input
                          aria-label={`Desconto de ${item.displayName}`}
                          className="field mt-0.5 h-9 px-2 py-1.5 text-sm"
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.discount}
                          disabled={isPending}
                          onChange={(event) => updateCart(item.id, { discount: Number(event.target.value) || 0 })}
                        />
                      </label>
                      <button type="button" aria-label={`Remover ${item.displayName}`} className="grid size-9 place-items-center rounded-md text-red-700 hover:bg-red-50" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} disabled={isPending}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid h-full min-h-52 place-items-center rounded-lg border border-dashed border-[var(--line)] p-6 text-center">
                <div>
                  <ShoppingCart className="mx-auto text-[var(--muted)]" size={28} />
                  <p className="mt-2 text-sm font-black">Carrinho vazio</p>
                  <p className="mt-1 max-w-48 text-xs font-semibold text-[var(--muted)]">Busque, escaneie ou toque em um produto para adicionar.</p>
                </div>
              </div>
            )}
          </div>
          <footer className="border-t border-[var(--line)] bg-[#fafafa] px-3 py-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-[var(--muted)]">Subtotal</span><strong>{money(subtotal)}</strong></div>
          </footer>
        </section>

        <aside className="surface flex min-h-0 flex-col overflow-hidden" aria-label="Cliente, pagamento e resumo da venda">
          <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
            <section aria-labelledby="pdv-customer-title" data-pdv-panel="customer">
              <div className="flex items-center justify-between gap-2">
                <h2 id="pdv-customer-title" className="text-sm font-black">Cliente <span className="font-semibold text-[var(--muted)]">(opcional)</span></h2>
                <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-dark)] hover:underline" onClick={() => openDialog(quickCustomerDialogRef.current)} disabled={isPending}>
                  <UserPlus size={14} /> Cadastro rápido
                </button>
              </div>
              {selectedCustomer ? (
                <div className="mt-2 flex min-h-10 items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-2 text-xs">
                  <div className="min-w-0">
                    <strong className="block truncate">{selectedCustomer.name ?? selectedCustomer.email}</strong>
                    <span className="block truncate text-green-800">{selectedCustomer.phone ?? selectedCustomer.email}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedCustomer(null)} className="grid size-7 shrink-0 place-items-center rounded text-green-900 hover:bg-green-100" aria-label="Remover cliente selecionado" disabled={isPending}>
                    <X size={15} />
                  </button>
                </div>
              ) : quickCustomerApplied ? (
                <div className="mt-2 flex min-h-10 items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs">
                  <div className="min-w-0">
                    <strong className="block truncate">{quickCustomer.name || "Cliente rápido"}</strong>
                    <span className="block truncate text-blue-800">{quickCustomer.phone || quickCustomer.email || "Dados vinculados à venda"}</span>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button type="button" onClick={() => openDialog(quickCustomerDialogRef.current)} className="px-2 py-1 font-bold text-blue-800 hover:underline" disabled={isPending}>Editar</button>
                    <button type="button" onClick={() => { setQuickCustomerApplied(false); setQuickCustomer({ name: "", phone: "", document: "", email: "" }); }} className="grid size-7 place-items-center rounded text-blue-900 hover:bg-blue-100" aria-label="Remover cliente rápido" disabled={isPending}><X size={15} /></button>
                  </div>
                </div>
              ) : (
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={15} />
                  <input
                    ref={customerRef}
                    className="field h-10 py-2 pl-8 pr-8 text-sm"
                    value={customerQuery}
                    onChange={(event) => {
                      const nextQuery = event.target.value;
                      setCustomerQuery(nextQuery);
                      setCustomers([]);
                      setCustomerError("");
                      setLoadingCustomers(nextQuery.trim().length >= 2 && !isDemo);
                      if (nextQuery.trim().length < 2) {
                        setLoadingCustomers(false);
                        setCustomers([]);
                      }
                    }}
                    placeholder="Buscar cliente (F3)"
                    aria-label="Buscar cliente por nome, telefone, CPF ou e-mail"
                    autoComplete="off"
                  />
                  {loadingCustomers ? <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 motion-safe:animate-spin text-[var(--muted)]" size={15} /> : null}
                  {customerQuery.trim().length >= 2 ? (
                    <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-48 overflow-y-auto rounded-md border border-[var(--line)] bg-white p-1 shadow-lg">
                      {loadingCustomers ? (
                        <CustomerListSkeleton />
                      ) : customerError ? (
                        <p role="alert" className="p-2 text-xs font-semibold text-red-700">{customerError}</p>
                      ) : visibleCustomers.length > 0 ? visibleCustomers.map((customer) => (
                        <button key={customer.id} type="button" onClick={() => { setSelectedCustomer(customer); setQuickCustomerApplied(false); setCustomerQuery(""); }} className="block w-full rounded p-2 text-left text-xs hover:bg-[#f5f4f2]">
                          <strong className="block truncate">{customer.name ?? customer.email}</strong>
                          <span className="block truncate text-[var(--muted)]">{customer.phone ?? customer.email}</span>
                        </button>
                      )) : (
                        <p className="p-2 text-xs font-semibold text-[var(--muted)]">Nenhum cliente encontrado. Use “Cadastro rápido”.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="mt-3 border-t border-[var(--line)] pt-3" aria-labelledby="pdv-payment-title" data-pdv-panel="payment">
              <h2 id="pdv-payment-title" className="text-sm font-black">Pagamento</h2>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {paymentMethodList.map((method) => {
                  const Icon = methodIcons[method];
                  const selected = payments.some((payment) => payment.method === method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSinglePayment(method)}
                      aria-pressed={selected}
                      className={`flex min-h-10 items-center justify-center gap-1 rounded-md border px-1.5 text-[11px] font-bold transition ${selected ? "border-[var(--brand)] bg-[#fff1ef] text-[var(--brand-dark)]" : "border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[#f8f7f5]"}`}
                      disabled={isPending}
                    >
                      <Icon size={14} />
                      {methodLabels[method]}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 grid gap-1.5">
                {payments.map((payment, index) => (
                  <div key={payment.id} className="rounded-md border border-[var(--line)] bg-[#fafafa] p-1.5">
                    <div className="grid grid-cols-[minmax(0,1fr)_92px_32px] gap-1.5">
                      <select
                        className="field h-9 px-2 py-1 text-xs"
                        aria-label={`Forma do pagamento ${index + 1}`}
                        value={payment.method}
                        disabled={isPending}
                        onChange={(event) =>
                          setPayments((current) => current.map((entry) => entry.id === payment.id ? { ...entry, method: event.target.value as PaymentMethod, amountReceived: undefined } : entry))
                        }
                      >
                        {paymentMethodList.map((method) => <option key={method} value={method}>{methodLabels[method]}</option>)}
                      </select>
                      <input
                        className="field h-9 px-2 py-1 text-xs"
                        aria-label={`Valor do pagamento ${index + 1}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={payment.amount}
                        disabled={isPending}
                        onChange={(event) => setPayments((current) => current.map((entry) => entry.id === payment.id ? { ...entry, amount: Number(event.target.value) || 0 } : entry))}
                      />
                      <button type="button" className="grid size-8 place-items-center rounded text-red-700 hover:bg-red-50 disabled:opacity-40" onClick={() => removePaymentLine(payment.id)} disabled={isPending || payments.length <= 1} aria-label={`Remover pagamento ${index + 1}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {payment.method === "CASH" ? (
                      <label className="mt-1.5 grid grid-cols-[1fr_92px] items-center gap-2 text-[10px] font-black uppercase text-[var(--muted)]">
                        Valor recebido
                        <input
                          className="field h-9 px-2 py-1 text-xs"
                          type="number"
                          min={0}
                          step="0.01"
                          value={payment.amountReceived ?? payment.amount}
                          disabled={isPending}
                          onChange={(event) => setPayments((current) => current.map((entry) => entry.id === payment.id ? { ...entry, amountReceived: Number(event.target.value) || 0 } : entry))}
                        />
                      </label>
                    ) : null}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary min-h-9 px-2.5 py-2 text-xs" onClick={addPaymentLine} disabled={!canAddPaymentLine}>
                  <Plus size={14} /> Pagamento misto
                </button>
                {payments.length > 1 ? (
                  <p className="rounded-md bg-[#f6f7f9] px-2 py-1.5 text-[11px] font-bold text-[var(--muted)]">Total informado: {money(paymentTotal)} · Restante: {money(remainingPayment)}</p>
                ) : null}
              </div>
            </section>

            <section className="mt-3 border-t border-[var(--line)] pt-3" aria-labelledby="pdv-summary-title" data-pdv-panel="summary">
              <h2 id="pdv-summary-title" className="text-sm font-black">Resumo</h2>
              <div className="mt-2 grid gap-1.5 text-xs">
                <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                <div className="flex justify-between"><span>Descontos nos itens</span><strong>- {money(itemDiscount)}</strong></div>
                <label className="grid grid-cols-[1fr_110px] items-center gap-2 font-black text-[var(--muted)]">
                  Desconto geral <span className="font-semibold">(F4)</span>
                  <input ref={discountRef} aria-label="Desconto geral" className="field h-9 px-2 py-1 text-right text-sm text-[var(--ink)]" type="number" min={0} step="0.01" value={generalDiscount} disabled={isPending} onChange={(event) => setGeneralDiscount(Number(event.target.value) || 0)} />
                </label>
                <div className="mt-1 flex items-end justify-between border-t border-[var(--line)] pt-2">
                  <span className="font-black">Total</span>
                  <strong className="text-2xl leading-none text-[var(--brand)]">{money(total)}</strong>
                </div>
                {cashLine ? <div className="flex justify-between rounded-md bg-[#f6f7f9] px-2 py-1.5 font-black"><span>Troco</span><span>{money(cashChange)}</span></div> : null}
                <p className="text-[10px] font-semibold text-[var(--muted)]">Dinheiro esperado no caixa: {money(expectedAmount)}</p>
              </div>
            </section>
          </div>

          <footer className="border-t border-[var(--line)] bg-white p-3">
            <button type="button" className="btn btn-primary min-h-12 w-full" disabled={isPending || total <= 0} onClick={() => void submitSale()} data-pdv-finalize aria-label="Finalizar venda">
              {isPending ? <Loader2 className="motion-safe:animate-spin" size={18} /> : <ReceiptText size={18} />}
              {isPending ? "Finalizando..." : "Finalizar venda (F8)"}
            </button>
            {receiptUrl ? (
              <Link href={receiptUrl} className="btn btn-secondary mt-1.5 min-h-9 w-full py-2 text-xs" target="_blank">
                <Printer size={15} /> Abrir comprovante
              </Link>
            ) : null}
          </footer>
        </aside>
      </div>

      {message ? (
        <div className={`fixed right-3 top-20 z-50 flex max-w-[calc(100%-24px)] items-start gap-2 rounded-lg border bg-white p-3 text-sm font-bold shadow-lg sm:max-w-sm ${message.type === "ok" ? "border-green-200 text-green-800" : message.type === "info" ? "border-blue-200 text-blue-800" : "border-red-200 text-red-800"}`} role={message.type === "error" ? "alert" : "status"} aria-live="polite">
          {message.type === "ok" ? <CheckCircle2 className="mt-0.5 shrink-0" size={17} /> : null}
          <span>{message.text}</span>
          <button type="button" className="grid size-6 shrink-0 place-items-center rounded hover:bg-black/5" onClick={() => setMessage(null)} aria-label="Fechar mensagem"><X size={14} /></button>
        </div>
      ) : null}

      <dialog
        ref={quickCustomerDialogRef}
        className="fixed inset-0 z-50 m-auto max-h-[calc(100dvh-24px)] overflow-y-auto w-[min(448px,calc(100%-24px))] bg-transparent p-0 backdrop:bg-black/45"
        aria-labelledby="quick-customer-title"
        onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialog(quickCustomerDialogRef.current); }}
      >
          <section className="surface w-full p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="quick-customer-title" className="text-lg font-black">Cliente rápido</h2>
                <p className="text-xs font-semibold text-[var(--muted)]">Dados opcionais usados apenas nesta venda.</p>
              </div>
              <button type="button" className="grid size-9 place-items-center rounded-md hover:bg-[#f3f2f0]" onClick={() => closeDialog(quickCustomerDialogRef.current)} aria-label="Fechar cadastro rápido"><X size={18} /></button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-black">Nome<input autoFocus className="field mt-1" value={quickCustomer.name} onChange={(event) => setQuickCustomer((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="text-xs font-black">Telefone<input className="field mt-1" value={quickCustomer.phone} onChange={(event) => setQuickCustomer((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label className="text-xs font-black">CPF (opcional)<input className="field mt-1" value={quickCustomer.document} onChange={(event) => setQuickCustomer((current) => ({ ...current, document: event.target.value }))} /></label>
              <label className="text-xs font-black">E-mail (opcional)<input className="field mt-1" type="email" value={quickCustomer.email} onChange={(event) => setQuickCustomer((current) => ({ ...current, email: event.target.value }))} /></label>
            </div>
            <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => { setSelectedCustomer(null); setQuickCustomerApplied(true); setCustomerQuery(""); closeDialog(quickCustomerDialogRef.current); setMessage({ type: "ok", text: "Cliente rápido vinculado à venda." }); }} disabled={!quickCustomer.name.trim() && !quickCustomer.phone.trim() && !quickCustomer.email.trim()}>
              Usar nesta venda
            </button>
          </section>
      </dialog>

      <dialog
        ref={clearSaleDialogRef}
        className="fixed inset-0 z-50 m-auto w-[min(384px,calc(100%-24px))] bg-transparent p-0 backdrop:bg-black/45"
        role="alertdialog"
        aria-labelledby="clear-sale-title"
        onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialog(clearSaleDialogRef.current); }}
      >
          <section className="surface w-full p-5 shadow-xl">
            <h2 id="clear-sale-title" className="text-lg font-black">Limpar a venda atual?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">Produtos, cliente, descontos e pagamentos serão removidos. O estoque não será alterado.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => closeDialog(clearSaleDialogRef.current)}>Continuar venda</button>
              <button type="button" className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={clearSale}>Limpar venda</button>
            </div>
          </section>
      </dialog>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ffd8d1] bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase text-[var(--muted)]">Total</p><strong className="text-xl text-[var(--brand)]">{money(total)}</strong></div>
          <button type="button" className="btn btn-primary min-h-12 px-5" disabled={isPending || total <= 0} onClick={() => void submitSale()}>{isPending ? "Finalizando..." : "Finalizar"}</button>
        </div>
      </div>
    </>
  );
}

function ProductListSkeleton() {
  return (
    <div className="grid gap-2 min-[1500px]:grid-cols-2" aria-hidden="true" data-pdv-skeleton="products">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid min-h-[72px] motion-safe:animate-pulse grid-cols-[52px_1fr] gap-2.5 rounded-lg border border-[var(--line)] p-2">
          <div className="aspect-square rounded-md bg-[#eceae7]" />
          <div className="grid content-center gap-2"><div className="h-3 w-4/5 rounded bg-[#eceae7]" /><div className="h-2.5 w-1/2 rounded bg-[#f0efed]" /><div className="h-3 w-2/5 rounded bg-[#eceae7]" /></div>
        </div>
      ))}
    </div>
  );
}

function CustomerListSkeleton() {
  return (
    <div className="grid gap-1 p-1" aria-hidden="true" data-pdv-skeleton="customers">
      {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-11 motion-safe:animate-pulse rounded bg-[#eeece9]" />)}
    </div>
  );
}

function openDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}
