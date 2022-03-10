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

  const addProduct = async (productId: number) => {
    try {
      const cartProducts = [...cart];
      const productAlreadyExists = cartProducts.find((cartProduct)=> cartProduct.id === productId);

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      const productAmount = productAlreadyExists ? productAlreadyExists.amount : 0;
      const amount = productAmount + 1;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productAlreadyExists){
        productAlreadyExists.amount = amount;
      }else{
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount
        }
        
        cartProducts.push(newProduct);
      }

      setCart(cartProducts);
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartProducts));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const copyCart = [...cart];
      const productIndex = copyCart.findIndex(product => product.id === productId);

      if(productIndex >= 0){
        copyCart.splice(productIndex, 1);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      }else{
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
      if(amount <= 0){
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return; 
      }

      const updateCart = [...cart];
      const productCartUpdate = updateCart.find((product) => product.id === productId);

      if(productCartUpdate){
        productCartUpdate.amount = amount;

        setCart(updateCart);
      }else{
        throw Error();
      }
    
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
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
