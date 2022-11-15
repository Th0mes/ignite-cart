import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem('@RocketShoes:cart');

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const newCart = [...cart];

	const addProduct = async (productId: number): Promise<void> => {
		try {
			const productExists = newCart.find((product) => product.id === productId);

			const { data: stockData } = await api.get<Stock>(`/stock/${productId}`);

			const currAmount = productExists ? productExists.amount : 0;

			if (currAmount + 1 > stockData.amount) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			if (productExists) {
				productExists.amount = currAmount + 1;
			} else {
				const { data: productData } = await api.get<Product>(
					`/products/${productId}`
				);
				const newProduct = {
					...productData,
					amount: 1,
				};

				newCart.push(newProduct);
			}

			setCart(newCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
		} catch (error) {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const productIndex: number = newCart.findIndex(
				(product) => product.id === productId
			);

			if (productIndex >= 0) {
				newCart.splice(productIndex, 1);
				setCart(newCart);
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
			} else {
				throw Error();
			}
		} catch {
			toast.error('Erro na remoção do produto');
		}
	};

	const updateProductAmount = async ({
		productId,
		amount,
	}: UpdateProductAmount) => {
		try {
			if (amount <= 0) {
				return;
			}

			const { data: stockData } = await api.get<Stock>(`/stock/${productId}`);

			if (amount > stockData.amount) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			const productExists = newCart.find((product) => product.id === productId);

			if (productExists) {
				productExists.amount = amount;
				setCart(newCart);
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
			} else {
				throw Error();
			}
		} catch {
			toast.error('Erro na alteração de quantidade do produto');
		}
	};

	return (
		<CartContext.Provider
			value={{ cart, addProduct, removeProduct, updateProductAmount }}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
