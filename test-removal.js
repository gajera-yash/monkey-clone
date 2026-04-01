try {
  console.log('Loading coins route...');
  require('./server/routes/coins');
  console.log('Coins route loaded successfully (Razorpay should be gone).');

  console.log('Loading subscriptions route...');
  require('./server/routes/subscriptions');
  console.log('Subscriptions route loaded successfully (Razorpay should be gone).');
  
  process.exit(0);
} catch (error) {
  console.error('Error loading routes:', error.message);
  process.exit(1);
}
