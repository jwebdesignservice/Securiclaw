// Safe Sample #1: Basic Safe Code
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    if (!item || !item.price || !item.name) {
      throw new Error('Invalid item');
    }
    this.items.push(item);
  }
  
  getTotal() {
    return calculateTotal(this.items);
  }
}

export { ShoppingCart, validateEmail };
