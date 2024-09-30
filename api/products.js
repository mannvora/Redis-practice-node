export const getProducts = () => new Promise((resolve) => {
    setTimeout(() => {
        resolve({
            products: [
                {
                    id: 1,
                    name: "Shampoo",
                    price: "123"
                }
            ]
        });
    }, 2000);
});

export const getProductDetails = (id) => new Promise((resolve) => {
    setTimeout(() => {
        resolve({
            products: [
                {
                    id: id,
                    name: `Product ${id}`, 
                    price: Math.floor(Math.random() * id * 100)
                }
            ]
        });
    }, 2000);
});