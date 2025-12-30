const mongoose = require('mongoose');
require('dotenv').config();
const Game = require('./models/Game');

const sampleGames = [
  {
    name: 'Roulette',
    description: 'Classic casino roulette game with red, black, and green numbers',
    rules: `# Roulette Rules

## Objective
Predict where the ball will land on the spinning wheel.

## How to Play
1. Place your bet on numbers (0-36), colors (red/black), or groups
2. Dealer spins the wheel and drops the ball
3. Ball lands on a number
4. Winning bets are paid out

## Betting Options
- **Straight Up**: Single number (35:1 payout)
- **Red/Black**: Color bet (1:1 payout)
- **Odd/Even**: Number type (1:1 payout)
- **Dozens**: Groups of 12 (2:1 payout)

## Tips
- Start with outside bets for better odds
- Set a budget and stick to it
- Understand that each spin is independent`,
    imageUrl: 'https://via.placeholder.com/300x200?text=Roulette',
    category: 'roulette',
    playUrl: 'https://google.com',
    order: 1,
  },
  {
    name: 'Blackjack',
    description: 'Card game where you try to beat the dealer by getting 21',
    rules: `# Blackjack Rules

## Objective
Get cards totaling closer to 21 than the dealer without going over.

## Card Values
- Number cards: Face value
- Face cards (J, Q, K): 10 points
- Ace: 1 or 11 points

## How to Play
1. Receive two cards
2. Choose to Hit (take card) or Stand (keep current total)
3. Dealer reveals cards and must hit until 17+
4. Closest to 21 wins

## Special Moves
- **Double Down**: Double bet, receive one card
- **Split**: Separate identical cards into two hands
- **Blackjack**: Ace + 10-value card (pays 3:2)

## Tips
- Always split Aces and 8s
- Never split 10s
- Stand on 17 or higher`,
    imageUrl: 'https://via.placeholder.com/300x200?text=Blackjack',
    category: 'card',
    playUrl: 'https://google.com',
    order: 2,
  },
  {
    name: 'Slots - Lucky 7',
    description: 'Classic slot machine with lucky 7s and fruits',
    rules: `# Slots Rules

## Objective
Match symbols across paylines to win prizes.

## How to Play
1. Set your bet amount
2. Click SPIN
3. Reels spin and stop randomly
4. Winning combinations pay out

## Symbols
- **Lucky 7**: Highest payout
- **Fruits**: Medium payout
- **Bars**: Low payout
- **Wild**: Substitutes for any symbol

## Winning Lines
- 3 matching symbols on a payline
- Wilds can complete winning combinations

## Tips
- Check the paytable before playing
- Manage your bankroll
- Stop when ahead`,
    imageUrl: 'https://via.placeholder.com/300x200?text=Slots',
    category: 'slots',
    playUrl: 'https://google.com',
    order: 3,
  },
  {
    name: 'Dice Roll',
    description: 'Simple dice game - predict high or low',
    rules: `# Dice Roll Rules

## Objective
Predict if the dice roll will be High or Low.

## How to Play
1. Place bet on High (8-12) or Low (2-6)
2. Roll the dice
3. Total is calculated
4. If correct, win 2x your bet

## Payouts
- **High (8-12)**: 2:1
- **Low (2-6)**: 2:1
- **Seven (7)**: Push (bet returned)

## Tips
- Odds are nearly 50/50
- Seven is the neutral outcome
- Great for beginners`,
    imageUrl: 'https://via.placeholder.com/300x200?text=Dice',
    category: 'dice',
    playUrl: 'https://google.com',
    order: 4,
  },
  {
    name: 'Baccarat',
    description: 'Popular Asian card game comparing two hands',
    rules: `# Baccarat Rules

## Objective
Bet on which hand will be closest to 9.

## Card Values
- Aces: 1 point
- 2-9: Face value
- 10, J, Q, K: 0 points

## How to Play
1. Bet on Player, Banker, or Tie
2. Two cards dealt to each side
3. Third card may be drawn (automatic rules)
4. Closest to 9 wins

## Payouts
- **Player**: 1:1
- **Banker**: 0.95:1 (5% commission)
- **Tie**: 8:1

## Tips
- Banker bet has slight edge
- Avoid tie bets
- Simple game of chance`,
    imageUrl: 'https://via.placeholder.com/300x200?text=Baccarat',
    category: 'card',
    playUrl: 'https://google.com',
    order: 5,
  },
];

async function seedGames() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 URI: ${process.env.MONGODB_URI?.substring(0, 30)}...`);
    
    // Connect to MongoDB - Remove deprecated options
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB');
    console.log(`📦 Database: ${mongoose.connection.name}`);

    // Clear existing games
    const deleteResult = await Game.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing games`);

    // Insert sample games
    const games = await Game.insertMany(sampleGames);
    console.log(`✅ Inserted ${games.length} sample games`);

    // Display games
    console.log('\n📚 Sample Games Created:');
    games.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (${game.category})`);
    });

    console.log('\n✅ Seed completed successfully');
    console.log('\n💡 You can now start the server with: node server.js');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed error:', error.message);
    
    if (error.message.includes('IP')) {
      console.log('\n🔧 FIX: You need to whitelist your IP in MongoDB Atlas:');
      console.log('1. Go to https://cloud.mongodb.com');
      console.log('2. Select your cluster');
      console.log('3. Click "Network Access" in the left menu');
      console.log('4. Click "Add IP Address"');
      console.log('5. Click "Allow Access from Anywhere" (or add your current IP)');
      console.log('6. Click "Confirm"');
      console.log('7. Wait 1-2 minutes for changes to apply');
      console.log('8. Run this script again: node seed.js\n');
    }
    
    process.exit(1);
  }
}

seedGames();
