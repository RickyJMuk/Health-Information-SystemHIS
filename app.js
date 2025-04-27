const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure app
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Data files paths
const CLIENTS_FILE = path.join(__dirname, 'data', 'clients.json');
const PROGRAMS_FILE = path.join(__dirname, 'data', 'programs.json');

// Initialize data files if they don't exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

if (!fs.existsSync(CLIENTS_FILE)) {
  fs.writeFileSync(CLIENTS_FILE, '[]');
}

if (!fs.existsSync(PROGRAMS_FILE)) {
  fs.writeFileSync(PROGRAMS_FILE, '[]');
}

// Helper functions to read/write data
function readClients() {
  return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'));
}

function writeClients(clients) {
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
}

function readPrograms() {
  return JSON.parse(fs.readFileSync(PROGRAMS_FILE, 'utf8'));
}

function writePrograms(programs) {
  fs.writeFileSync(PROGRAMS_FILE, JSON.stringify(programs, null, 2));
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.render('index');
});

// Health Programs

// Create program form
app.get('/programs/new', (req, res) => {
  res.render('program-form');
});

// Create program
app.post('/programs', (req, res) => {
  const programs = readPrograms();
  const newProgram = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    createdAt: new Date().toISOString()
  };
  programs.push(newProgram);
  writePrograms(programs);
  res.redirect('/');
});

// List programs
app.get('/programs', (req, res) => {
  const programs = readPrograms();
  res.render('program-list', { programs });
});

// Clients

// Register client form
app.get('/clients/new', (req, res) => {
  res.render('client-form');
});

// Register client
app.post('/clients', (req, res) => {
  const clients = readClients();
  const newClient = {
    id: uuidv4(),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    dob: req.body.dob,
    gender: req.body.gender,
    address: req.body.address,
    phone: req.body.phone,
    email: req.body.email,
    registeredAt: new Date().toISOString(),
    programs: []
  };
  clients.push(newClient);
  writeClients(clients);
  res.redirect('/clients');
});

// List clients
app.get('/clients', (req, res) => {
  const clients = readClients();
  res.render('client-list', { clients });
});

// Search clients
app.get('/clients/search', (req, res) => {
  const query = req.query.q.toLowerCase();
  const clients = readClients().filter(client => 
    client.firstName.toLowerCase().includes(query) || 
    client.lastName.toLowerCase().includes(query) ||
    client.phone.includes(query)
  );
  res.render('client-list', { clients });
});

// View client profile
app.get('/clients/:id', (req, res) => {
  const clients = readClients();
  const programs = readPrograms();
  const client = clients.find(c => c.id === req.params.id);
  
  if (!client) {
    return res.status(404).send('Client not found');
  }
  
  // Get program details for enrolled programs
  const enrolledPrograms = client.programs.map(programId => 
    programs.find(p => p.id === programId)
  ).filter(Boolean);
  
  // Get available programs (not enrolled)
  const availablePrograms = programs.filter(p => 
    !client.programs.includes(p.id)
  );
  
  res.render('client-profile', { 
    client, 
    enrolledPrograms, 
    availablePrograms 
  });
});

// Enroll client in program
app.post('/clients/:id/enroll', (req, res) => {
  const clients = readClients();
  const client = clients.find(c => c.id === req.params.id);
  
  if (!client) {
    return res.status(404).send('Client not found');
  }
  
  if (!client.programs.includes(req.body.programId)) {
    client.programs.push(req.body.programId);
    writeClients(clients);
  }
  
  res.redirect(`/clients/${req.params.id}`);
});

// API Endpoint to get client profile
app.get('/api/clients/:id', (req, res) => {
  const clients = readClients();
  const programs = readPrograms();
  const client = clients.find(c => c.id === req.params.id);
  
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  // Get program details for enrolled programs
  const enrolledPrograms = client.programs.map(programId => {
    const program = programs.find(p => p.id === programId);
    return program ? { id: program.id, name: program.name } : null;
  }).filter(Boolean);
  
  const clientProfile = {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    dob: client.dob,
    gender: client.gender,
    contact: {
      address: client.address,
      phone: client.phone,
      email: client.email
    },
    registeredAt: client.registeredAt,
    programs: enrolledPrograms
  };
  
  res.json(clientProfile);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});