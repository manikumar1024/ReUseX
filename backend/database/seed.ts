import pool, { query } from '../src/config/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding CampusLoop database...');

  // Departments
  const departments = [
    { id: uuidv4(), name: 'Electronics & Communication Engineering', code: 'ECE', building: 'Electronics Block' },
    { id: uuidv4(), name: 'Computer Science & Engineering', code: 'CSE', building: 'CS Block' },
    { id: uuidv4(), name: 'Mechanical Engineering', code: 'MECH', building: 'Mechanical Block' },
    { id: uuidv4(), name: 'Physics Department', code: 'PHY', building: 'Science Block' },
    { id: uuidv4(), name: 'Student Activities', code: 'SA', building: 'Student Center' }
  ];

  for (const dept of departments) {
    await query(
      'INSERT INTO departments (id, name, code, building) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING',
      [dept.id, dept.name, dept.code, dept.building]
    );
  }

  // Categories
  const categories = [
    { slug: 'electronics', name: 'Electronics & Components', icon: '🔌', requires_approval: false },
    { slug: 'computing', name: 'Computing & IT', icon: '💻', requires_approval: false },
    { slug: 'books', name: 'Books & Study Materials', icon: '📚', requires_approval: false },
    { slug: 'laboratory', name: 'Laboratory Equipment', icon: '🔬', requires_approval: true },
    { slug: 'furniture', name: 'Furniture & Fixtures', icon: '🪑', requires_approval: false },
    { slug: 'sports', name: 'Sports Equipment', icon: '⚽', requires_approval: false },
    { slug: 'tools', name: 'Tools & Workshop', icon: '🔧', requires_approval: false },
    { slug: 'events', name: 'Event Equipment', icon: '🎤', requires_approval: false },
    { slug: 'other', name: 'Other', icon: '📦', requires_approval: false }
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of categories) {
    const res = await query(
      'INSERT INTO resource_categories (name, slug, requires_approval) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [cat.name, cat.slug, cat.requires_approval]
    );
    categoryIds[cat.slug] = res.rows[0].id;
  }

  // Users
  const passwordHash = await bcrypt.hash('Demo@1234', 12);

  const users = [
    { id: uuidv4(), email: 'admin@campusloop.edu', name: 'Campus Admin', role: 'campus_admin', dept: 'SA' },
    { id: uuidv4(), email: 'ece.admin@campusloop.edu', name: 'Dr. Priya Sharma', role: 'department_admin', dept: 'ECE' },
    { id: uuidv4(), email: 'lab.manager@campusloop.edu', name: 'Raj Kumar', role: 'lab_manager', dept: 'ECE' },
    { id: uuidv4(), email: 'faculty.cs@campusloop.edu', name: 'Prof. Ananya Krishnan', role: 'faculty', dept: 'CSE' },
    { id: uuidv4(), email: 'faculty.mech@campusloop.edu', name: 'Dr. Vikram Nair', role: 'faculty', dept: 'MECH' },
    { id: uuidv4(), email: 'arjun@campusloop.edu', name: 'Arjun Mehta', role: 'student', dept: 'ECE' },
    { id: uuidv4(), email: 'priya@campusloop.edu', name: 'Priya Patel', role: 'student', dept: 'CSE' },
    { id: uuidv4(), email: 'rahul@campusloop.edu', name: 'Rahul Singh', role: 'student', dept: 'MECH' },
    { id: uuidv4(), email: 'sneha@campusloop.edu', name: 'Sneha Rao', role: 'student', dept: 'ECE' },
    { id: uuidv4(), email: 'karan@campusloop.edu', name: 'Karan Joshi', role: 'student', dept: 'CSE' },
    { id: uuidv4(), email: 'divya@campusloop.edu', name: 'Divya Nair', role: 'student', dept: 'PHY' },
    { id: uuidv4(), email: 'amit@campusloop.edu', name: 'Amit Kumar', role: 'student', dept: 'ECE' },
    { id: uuidv4(), email: 'neha@campusloop.edu', name: 'Neha Sharma', role: 'student', dept: 'CSE' },
    { id: uuidv4(), email: 'rohit@campusloop.edu', name: 'Rohit Gupta', role: 'student', dept: 'MECH' },
    { id: uuidv4(), email: 'pooja@campusloop.edu', name: 'Pooja Verma', role: 'student', dept: 'SA' },
    { id: uuidv4(), email: 'siddharth@campusloop.edu', name: 'Siddharth Patel', role: 'student', dept: 'ECE' },
    { id: uuidv4(), email: 'kavya@campusloop.edu', name: 'Kavya Reddy', role: 'student', dept: 'CSE' },
    { id: uuidv4(), email: 'harsh@campusloop.edu', name: 'Harsh Malhotra', role: 'student', dept: 'MECH' },
    { id: uuidv4(), email: 'isha@campusloop.edu', name: 'Isha Jain', role: 'student', dept: 'PHY' },
    { id: uuidv4(), email: 'deepak@campusloop.edu', name: 'Deepak Srivastava', role: 'club_org', dept: 'SA' }
  ];

  // Get dept IDs
  const deptRows = await query('SELECT id, code FROM departments');
  const deptMap: Record<string, string> = {};
  for (const d of deptRows.rows) deptMap[d.code] = d.id;

  const userIds: Record<string, string> = {};
  for (const u of users) {
    await query(
      `INSERT INTO users (id, email, password_hash, name, role, department_id, is_verified, reliability_score, total_loans, successful_returns)
       VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9)
       ON CONFLICT (email) DO NOTHING`,
      [u.id, u.email, passwordHash, u.name, u.role, deptMap[u.dept] || null,
       4.5 + Math.random() * 0.5, Math.floor(Math.random() * 15), Math.floor(Math.random() * 12)]
    );
    userIds[u.email] = u.id;
  }

  // Knowledge base documents
  const docs = [
    {
      title: 'Campus Resource Borrowing Policy',
      content: `Campus Resource Borrowing Policy

1. ELIGIBILITY
All students, faculty, staff, and registered clubs are eligible to borrow campus resources through CampusLoop.

2. BORROWING PERIODS
Standard borrowing period is 7 days for students, 30 days for faculty.
Laboratory equipment: maximum 14 days.
Event equipment: maximum 3 days.
Extensions may be requested through the system.

3. PROCESS
All resource requests must be made through CampusLoop. Phone or walk-in requests are not permitted.
Resources must be collected within 24 hours of approval.
Returns must be completed by the agreed date.

4. RESPONSIBILITY
Borrowers are responsible for the safe return of all resources.
Any damage beyond normal wear must be reported immediately.
Lost resources must be compensated at current market value.

5. PENALTIES
Late returns: Warning for first offense, 30-day suspension for repeated violations.
Damaged resources: Repair cost charged to borrower.

6. DISPUTES
All disputes are handled by the Campus Resource Committee.`
    },
    {
      title: 'Laboratory Equipment Usage Guidelines',
      content: `Laboratory Equipment Guidelines

SAFETY REQUIREMENTS
All users of laboratory equipment must have completed the relevant safety induction.
Personal protective equipment (PPE) must be worn at all times.
Hazardous equipment requires explicit departmental approval.

BOOKING AND USAGE
Laboratory equipment must be booked 48 hours in advance.
Maximum booking duration: 14 days.
Equipment must be returned clean and in working order.
Any faults must be reported immediately — do not attempt to repair equipment.

RESTRICTED EQUIPMENT
The following require additional clearance:
- High-voltage equipment (>240V)
- Chemical analysis equipment
- Precision measurement instruments
- Biological safety cabinets
Contact the Lab Manager for clearance procedures.

PROHIBITED USES
Equipment must not be used for commercial projects.
No modification of any laboratory equipment without written permission.`
    },
    {
      title: 'Sustainability and Reuse Policy',
      content: `Campus Sustainability & Reuse Policy

MISSION
CampusLoop is part of our campus commitment to circular resource use. The principle: never buy what the campus already has.

PRIORITY ORDER FOR RESOURCE ACQUISITION
1. Check CampusLoop for existing campus resources
2. Request transfer from another department
3. Consider rental or lease
4. Purchase as last resort

PURCHASE REQUISITION
All purchase requisitions for items available on CampusLoop must include a Campus Check Certificate.
Department admins must verify that no suitable campus resource exists before approving purchases.

RESOURCE LIFECYCLE
Departments must list idle assets on CampusLoop within 90 days of last use.
Assets held for more than 12 months without use should be reviewed for reallocation.

IMPACT REPORTING
CampusLoop tracks reuse impact including estimated financial savings and environmental indicators.
Department sustainability reports are generated quarterly.`
    }
  ];

  for (const doc of docs) {
    const docRes = await query(
      'INSERT INTO knowledge_documents (title, content, type, created_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id',
      [doc.title, doc.content, 'policy', userIds['admin@campusloop.edu']]
    );

    if (docRes.rows[0]) {
      // Create chunks
      const chunks = chunkText(doc.content, 400);
      for (let i = 0; i < chunks.length; i++) {
        await query(
          'INSERT INTO knowledge_chunks (document_id, chunk_index, content) VALUES ($1,$2,$3)',
          [docRes.rows[0].id, i, chunks[i]]
        );
      }
    }
  }

  // Resources
  const resources = [
    {
      id: uuidv4(), title: 'ESP32 DevKit V1', description: 'ESP32-WROOM-32 development board with dual-core processor, Wi-Fi, Bluetooth, 38 GPIO pins. Perfect for IoT projects. Includes USB cable and basic getting-started guide.',
      category: 'electronics', resource_type: 'microcontroller', owner: 'lab.manager@campusloop.edu',
      condition: 'excellent', location: 'Electronics Lab B-12', building: 'Electronics Block',
      mode: 'borrow', tags: ['esp32', 'iot', 'wifi', 'microcontroller', 'bluetooth'],
      specifications: { 'CPU': 'Dual-core 240MHz', 'Wi-Fi': '802.11 b/g/n', 'Bluetooth': '4.2', 'GPIO': '38 pins', 'Flash': '4MB' }
    },
    {
      id: uuidv4(), title: 'Arduino Uno R3 Starter Kit', description: 'Complete Arduino Uno R3 starter kit with breadboard, jumper wires, resistors, LEDs, sensors, servo motor, LCD display, and all essential components for learning electronics and building projects.',
      category: 'electronics', resource_type: 'microcontroller kit', owner: 'arjun@campusloop.edu',
      condition: 'good', location: 'Room 204', building: 'Electronics Block',
      mode: 'borrow', tags: ['arduino', 'starter kit', 'electronics', 'learning', 'microcontroller'],
      specifications: { 'Microcontroller': 'ATmega328P', 'Digital I/O': '14 pins', 'Analog Input': '6 pins', 'Voltage': '5V/3.3V' }
    },
    {
      id: uuidv4(), title: 'Raspberry Pi 4 Model B (4GB)', description: 'Raspberry Pi 4 Model B with 4GB RAM. Includes power supply, micro-HDMI cable, and 32GB microSD with Raspberry Pi OS pre-installed. Ideal for Linux projects, AI/ML edge computing, and server applications.',
      category: 'electronics', resource_type: 'single-board computer', owner: 'faculty.cs@campusloop.edu',
      condition: 'excellent', location: 'CS Research Lab 101', building: 'CS Block',
      mode: 'borrow', tags: ['raspberry pi', 'linux', 'computing', 'ai', 'edge computing'],
      specifications: { 'CPU': 'Cortex-A72 1.8GHz', 'RAM': '4GB', 'USB': '2x USB 3.0, 2x USB 2.0', 'Connectivity': 'Wi-Fi + Bluetooth + Ethernet' }
    },
    {
      id: uuidv4(), title: 'Digital Storage Oscilloscope (100MHz)', description: 'Rigol DS1054Z 4-channel digital storage oscilloscope with 100MHz bandwidth. Essential for electronic circuit debugging and signal analysis. Includes probes and calibration certificate.',
      category: 'laboratory', resource_type: 'oscilloscope', owner: 'lab.manager@campusloop.edu',
      condition: 'good', location: 'ECE Lab A-04', building: 'Electronics Block',
      mode: 'borrow', tags: ['oscilloscope', 'measurement', 'electronics', 'debugging', 'signal'],
      specifications: { 'Bandwidth': '100MHz', 'Channels': '4', 'Sample Rate': '1GSa/s', 'Memory': '12Mpts' }
    },
    {
      id: uuidv4(), title: 'NodeMCU ESP8266 WiFi Module', description: 'NodeMCU development board based on ESP8266 chip. Built-in Wi-Fi, 11 GPIO pins, analog input. Great for IoT projects and smart home automation.',
      category: 'electronics', resource_type: 'wifi module', owner: 'sneha@campusloop.edu',
      condition: 'good', location: 'Room 301', building: 'Electronics Block',
      mode: 'borrow', tags: ['nodemcu', 'esp8266', 'wifi', 'iot', 'arduino compatible'],
      specifications: { 'MCU': 'ESP8266', 'WiFi': '802.11 b/g/n', 'GPIO': '11 pins', 'Flash': '4MB' }
    },
    {
      id: uuidv4(), title: 'DHT22 Temperature & Humidity Sensors (Pack of 5)', description: 'Pack of 5 DHT22 sensors for measuring temperature (-40°C to 80°C) and relative humidity (0-100%). Digital output, single wire protocol. Ideal for weather stations and environmental monitoring.',
      category: 'electronics', resource_type: 'sensor', owner: 'arjun@campusloop.edu',
      condition: 'excellent', location: 'Room 204', building: 'Electronics Block',
      mode: 'give', tags: ['sensor', 'temperature', 'humidity', 'dht22', 'iot', 'environment'],
      specifications: { 'Temperature Range': '-40°C to 80°C', 'Humidity Range': '0-100% RH', 'Accuracy': '±0.5°C, ±2-5% RH', 'Protocol': 'Single-wire digital' }
    },
    {
      id: uuidv4(), title: 'Soil Moisture Sensor Module', description: 'Capacitive soil moisture sensor module (v1.2). More accurate and corrosion-resistant than resistive type. Suitable for agriculture IoT projects, plant monitoring systems.',
      category: 'electronics', resource_type: 'sensor', owner: 'deepak@campusloop.edu',
      condition: 'good', location: 'Student Activities Office', building: 'Student Center',
      mode: 'borrow', tags: ['sensor', 'soil', 'moisture', 'agriculture', 'iot', 'plant'],
      specifications: { 'Output': 'Analog 0-3.3V', 'Supply': '3.3-5.5V', 'Type': 'Capacitive' }
    },
    {
      id: uuidv4(), title: 'Dell Laptop Charger 65W (USB-C)', description: 'Dell 65W USB-C power adapter. Compatible with Dell Latitude, XPS, and Inspiron series with USB-C charging port.',
      category: 'computing', resource_type: 'laptop charger', owner: 'karan@campusloop.edu',
      condition: 'good', location: 'CS Block Hostel Wing', building: 'CS Block',
      mode: 'borrow', tags: ['charger', 'dell', 'usb-c', 'laptop', 'power adapter'],
      specifications: { 'Wattage': '65W', 'Connector': 'USB-C', 'Compatible': 'Dell XPS, Latitude, Inspiron' }
    },
    {
      id: uuidv4(), title: 'Soldering Station (Temperature Controlled)', description: 'Hakko FX-888D temperature-controlled soldering station. Temperature range 200-480°C. Includes 5 interchangeable tips. Well-maintained and calibrated.',
      category: 'tools', resource_type: 'soldering equipment', owner: 'lab.manager@campusloop.edu',
      condition: 'excellent', location: 'ECE Workshop B-08', building: 'Electronics Block',
      mode: 'borrow', tags: ['soldering', 'electronics', 'workshop', 'fabrication', 'hakko'],
      specifications: { 'Temperature': '200-480°C', 'Power': '70W', 'Model': 'Hakko FX-888D' }
    },
    {
      id: uuidv4(), title: 'Engineering Graphics Drawing Board', description: 'A1-size drawing board with parallel motion ruler. Complete with set squares, protractor, and technical pens. Required for first-year engineering drawing course.',
      category: 'tools', resource_type: 'drawing equipment', owner: 'rahul@campusloop.edu',
      condition: 'fair', location: 'Hostel Block C Room 208', building: 'Mechanical Block',
      mode: 'give', tags: ['drawing board', 'engineering graphics', 'mechanical', 'A1'],
      specifications: { 'Size': 'A1', 'Includes': 'Parallel motion, set squares, protractor' }
    },
    {
      id: uuidv4(), title: 'Data Structures and Algorithms (Cormen)', description: 'Introduction to Algorithms (CLRS) 4th Edition by Cormen, Leiserson, Rivest, and Stein. Excellent condition. Notes on some pages but fully readable.',
      category: 'books', resource_type: 'textbook', owner: 'priya@campusloop.edu',
      condition: 'good', location: 'CS Block Library Lounge', building: 'CS Block',
      mode: 'borrow', tags: ['algorithms', 'data structures', 'CLRS', 'CS', 'textbook'],
      specifications: { 'Edition': '4th', 'Authors': 'Cormen et al.', 'Publisher': 'MIT Press' }
    },
    {
      id: uuidv4(), title: 'Portable Projector (HDMI + WiFi)', description: 'Anker Nebula Capsule II mini projector. 200 ANSI lumens, HDMI and Wi-Fi, 3-hour battery. Great for presentations, hackathons, and group study sessions.',
      category: 'events', resource_type: 'projector', owner: 'deepak@campusloop.edu',
      condition: 'excellent', location: 'Student Center Room 105', building: 'Student Center',
      mode: 'borrow', tags: ['projector', 'presentation', 'portable', 'wifi', 'hdmi', 'events'],
      specifications: { 'Brightness': '200 ANSI lm', 'Resolution': '720p', 'Battery': '3 hours', 'Connectivity': 'HDMI, Wi-Fi' }
    },
    {
      id: uuidv4(), title: 'Relay Module 4-Channel (5V)', description: 'Set of 3 four-channel relay modules (5V). Each relay handles up to 10A/250VAC. Used for controlling AC devices from microcontrollers.',
      category: 'electronics', resource_type: 'relay module', owner: 'arjun@campusloop.edu',
      condition: 'good', location: 'Room 204', building: 'Electronics Block',
      mode: 'give', tags: ['relay', 'electronics', 'automation', 'ac control', 'iot'],
      specifications: { 'Channels': '4', 'Control': '5V TTL', 'Load': '10A/250VAC' }
    },
    {
      id: uuidv4(), title: 'Digital Multimeter (Fluke 87V)', description: 'Fluke 87V industrial digital multimeter. Measures voltage, current, resistance, capacitance, temperature, and frequency. Includes test probes and thermocouple.',
      category: 'laboratory', resource_type: 'multimeter', owner: 'lab.manager@campusloop.edu',
      condition: 'good', location: 'ECE Lab A-04', building: 'Electronics Block',
      mode: 'borrow', tags: ['multimeter', 'measurement', 'electronics', 'fluke', 'lab equipment'],
      specifications: { 'Model': 'Fluke 87V', 'Type': 'True RMS', 'Ranges': 'V/A/Ω/C/F/Hz/Temp' }
    },
    {
      id: uuidv4(), title: 'Camera Tripod (Heavy Duty, 72")', description: 'Professional 72-inch aluminum tripod with fluid pan head. Supports up to 5kg. Great for photography, videography, and lab documentation.',
      category: 'events', resource_type: 'camera support', owner: 'pooja@campusloop.edu',
      condition: 'excellent', location: 'Student Center', building: 'Student Center',
      mode: 'borrow', tags: ['tripod', 'camera', 'photography', 'events', 'videography'],
      specifications: { 'Height': 'Up to 72"', 'Load': '5kg max', 'Head': 'Fluid pan' }
    },
    {
      id: uuidv4(), title: 'Raspberry Pi Pico W (Pack of 3)', description: 'Three Raspberry Pi Pico W boards with wireless connectivity. RP2040 microcontroller, Wi-Fi, 2MB flash. Ideal for low-power IoT applications.',
      category: 'electronics', resource_type: 'microcontroller', owner: 'faculty.cs@campusloop.edu',
      condition: 'excellent', location: 'CS Research Lab 101', building: 'CS Block',
      mode: 'borrow', tags: ['raspberry pi pico', 'pico w', 'wifi', 'microcontroller', 'rp2040', 'iot'],
      specifications: { 'MCU': 'RP2040 dual-core', 'Flash': '2MB', 'WiFi': '802.11n', 'GPIO': '26 pins' }
    },
    {
      id: uuidv4(), title: 'Sports Badminton Set (2 Rackets + Shuttlecocks)', description: 'Yonex Nanoray badminton set with 2 rackets, 6 shuttlecocks, and carry bag. Available on weekends.',
      category: 'sports', resource_type: 'badminton set', owner: 'deepak@campusloop.edu',
      condition: 'good', location: 'Sports Complex Storage', building: 'Student Center',
      mode: 'borrow', tags: ['badminton', 'sports', 'yonex', 'racket'],
      specifications: { 'Rackets': '2', 'Shuttlecocks': '6', 'Brand': 'Yonex' }
    },
    {
      id: uuidv4(), title: 'BMP280 Pressure/Temperature Sensor (x5)', description: 'Pack of 5 BMP280 pressure and temperature sensors. I2C/SPI interface, altitude measurement capability. Suitable for weather station and drone projects.',
      category: 'electronics', resource_type: 'sensor', owner: 'sneha@campusloop.edu',
      condition: 'excellent', location: 'Room 301', building: 'Electronics Block',
      mode: 'give', tags: ['sensor', 'pressure', 'temperature', 'bmp280', 'altitude', 'weather'],
      specifications: { 'Measures': 'Pressure + Temperature', 'Interface': 'I2C/SPI', 'Range': '300-1100 hPa' }
    },
    {
      id: uuidv4(), title: 'Organic Chemistry Textbook (Morrison & Boyd)', description: 'Organic Chemistry by Morrison and Boyd, 7th edition. Some highlighting but complete and readable. Good reference for chemistry and biotechnology students.',
      category: 'books', resource_type: 'textbook', owner: 'isha@campusloop.edu',
      condition: 'fair', location: 'Science Block Reading Room', building: 'Science Block',
      mode: 'give', tags: ['chemistry', 'organic chemistry', 'textbook', 'morrison boyd'],
      specifications: { 'Subject': 'Organic Chemistry', 'Edition': '7th', 'Condition note': 'Some highlighting' }
    },
    {
      id: uuidv4(), title: 'Breadboard (Full-size, 830 points) + Jumper Wires', description: 'Full-size 830-point solderless breadboard with 65-piece M-M jumper wire set. Essential for circuit prototyping.',
      category: 'electronics', resource_type: 'prototyping tools', owner: 'amit@campusloop.edu',
      condition: 'good', location: 'ECE Hostel Wing Room 112', building: 'Electronics Block',
      mode: 'give', tags: ['breadboard', 'prototyping', 'jumper wires', 'electronics', 'circuit'],
      specifications: { 'Points': '830', 'Jumpers': '65 pieces M-M', 'Rows': '63 rows' }
    },
    {
      id: uuidv4(), title: 'Adjustable DC Power Supply (0-30V, 0-5A)', description: 'Adjustable bench power supply with voltage 0-30V and current 0-5A. Dual display for voltage and current. Essential for lab work and electronics projects.',
      category: 'laboratory', resource_type: 'power supply', owner: 'lab.manager@campusloop.edu',
      condition: 'good', location: 'ECE Lab A-04', building: 'Electronics Block',
      mode: 'borrow', tags: ['power supply', 'bench', 'adjustable', 'electronics', 'lab'],
      specifications: { 'Voltage': '0-30V adjustable', 'Current': '0-5A', 'Display': 'Dual LED' }
    },
    {
      id: uuidv4(), title: '3D Printer Filament (PLA 1kg - White)', description: 'Unused 1kg spool of white PLA filament, 1.75mm diameter. Compatible with most FDM 3D printers.',
      category: 'tools', resource_type: '3d printing material', owner: 'rohit@campusloop.edu',
      condition: 'excellent', location: 'Mechanical Workshop Room 202', building: 'Mechanical Block',
      mode: 'exchange', tags: ['3d printing', 'filament', 'PLA', 'white', 'mechanical'],
      specifications: { 'Material': 'PLA', 'Diameter': '1.75mm', 'Weight': '1kg', 'Color': 'White' }
    },
    {
      id: uuidv4(), title: 'Wireless Microphone (Lavalier Set)', description: 'UHF wireless lavalier (lapel) microphone set with transmitter, receiver, and clip. Range 30m. Ideal for presentations, vlogging, and events.',
      category: 'events', resource_type: 'microphone', owner: 'pooja@campusloop.edu',
      condition: 'good', location: 'Student Center AV Room', building: 'Student Center',
      mode: 'borrow', tags: ['microphone', 'wireless', 'lavalier', 'events', 'presentation', 'lapel'],
      specifications: { 'Type': 'UHF wireless', 'Range': '30m', 'Battery': '3 hours' }
    },
    {
      id: uuidv4(), title: 'HC-SR04 Ultrasonic Distance Sensor (x3)', description: 'Pack of 3 HC-SR04 ultrasonic distance sensors. Range 2cm-400cm, resolution 0.3cm. Widely used in robotics and obstacle detection projects.',
      category: 'electronics', resource_type: 'sensor', owner: 'siddharth@campusloop.edu',
      condition: 'good', location: 'ECE Room 305', building: 'Electronics Block',
      mode: 'give', tags: ['sensor', 'ultrasonic', 'distance', 'robotics', 'hc-sr04', 'obstacle detection'],
      specifications: { 'Range': '2-400cm', 'Resolution': '0.3cm', 'Angle': '15°', 'Frequency': '40kHz' }
    },
    {
      id: uuidv4(), title: 'Engineering Mathematics (Vol. 1 & 2)', description: 'Higher Engineering Mathematics by B.S. Grewal, 44th Edition. Both volumes. Widely used for university engineering math courses.',
      category: 'books', resource_type: 'textbook', owner: 'kavya@campusloop.edu',
      condition: 'good', location: 'CS Block Study Area', building: 'CS Block',
      mode: 'borrow', tags: ['mathematics', 'engineering math', 'grewal', 'textbook', 'calculus'],
      specifications: { 'Author': 'B.S. Grewal', 'Edition': '44th', 'Volumes': '2' }
    },
    {
      id: uuidv4(), title: 'Portable Whiteboard (60x90cm)', description: 'Foldable portable whiteboard with stand. Two-sided, includes markers and eraser. Suitable for study groups, project presentations, and team discussions.',
      category: 'furniture', resource_type: 'whiteboard', owner: 'deepak@campusloop.edu',
      condition: 'good', location: 'Student Center Room 105', building: 'Student Center',
      mode: 'borrow', tags: ['whiteboard', 'portable', 'presentation', 'study', 'foldable'],
      specifications: { 'Size': '60x90cm', 'Type': 'Double-sided magnetic', 'Includes': 'Stand, markers, eraser' }
    },
    {
      id: uuidv4(), title: 'Vernier Caliper (Digital, 0-150mm)', description: 'Digital vernier caliper with 0.01mm resolution. Stainless steel construction. Useful for mechanical measurements and lab work.',
      category: 'tools', resource_type: 'measuring instrument', owner: 'faculty.mech@campusloop.edu',
      condition: 'excellent', location: 'Mech Lab Room 110', building: 'Mechanical Block',
      mode: 'borrow', tags: ['caliper', 'measurement', 'mechanical', 'precision', 'vernier'],
      specifications: { 'Range': '0-150mm', 'Resolution': '0.01mm', 'Material': 'Stainless steel' }
    },
    {
      id: uuidv4(), title: 'Laptop — Lenovo ThinkPad E14 (Core i5)', description: 'Lenovo ThinkPad E14 laptop, Core i5-10th gen, 8GB RAM, 256GB SSD, Windows 11. For temporary use during final-year project season. Borrowers must sign liability form.',
      category: 'computing', resource_type: 'laptop', owner: 'ece.admin@campusloop.edu',
      condition: 'good', location: 'ECE Department Office', building: 'Electronics Block',
      mode: 'borrow', tags: ['laptop', 'lenovo', 'thinkpad', 'computing', 'windows'],
      specifications: { 'CPU': 'Intel Core i5-10210U', 'RAM': '8GB', 'Storage': '256GB SSD', 'OS': 'Windows 11' }
    },
    {
      id: uuidv4(), title: 'DSLR Camera Kit (Canon EOS 200D)', description: 'Canon EOS 200D DSLR with 18-55mm kit lens, 2 batteries, 32GB SD card, camera bag. Available for academic and club events.',
      category: 'events', resource_type: 'camera', owner: 'deepak@campusloop.edu',
      condition: 'good', location: 'Student Center AV Room', building: 'Student Center',
      mode: 'borrow', tags: ['camera', 'DSLR', 'canon', 'photography', 'events', 'film'],
      specifications: { 'Sensor': '24.1MP APS-C', 'Video': 'Full HD 1080p', 'Kit Lens': '18-55mm EF-S', 'Connectivity': 'Wi-Fi + NFC' }
    },
    {
      id: uuidv4(), title: 'Signal Generator (Function Generator, 10MHz)', description: 'GW Instek GFG-8210A function generator. Sine, square, triangle waveforms up to 10MHz. Used for circuit testing and calibration.',
      category: 'laboratory', resource_type: 'signal generator', owner: 'lab.manager@campusloop.edu',
      condition: 'fair', location: 'ECE Lab A-04', building: 'Electronics Block',
      mode: 'borrow', tags: ['signal generator', 'function generator', 'lab', 'electronics', 'test equipment'],
      specifications: { 'Frequency': 'Up to 10MHz', 'Waveforms': 'Sine, Square, Triangle', 'Output': '20Vpp max' }
    }
  ];

  const resourceIds: string[] = [];

  for (const r of resources) {
    await query(
      `INSERT INTO resources (id, title, description, category_id, resource_type, owner_id,
        condition, quantity, available_quantity, location, building, mode, tags, specifications, status, borrow_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1,1,$8,$9,$10,$11,$12,'available',$13)
       ON CONFLICT DO NOTHING`,
      [r.id, r.title, r.description, categoryIds[r.category], r.resource_type,
       userIds[r.owner], r.condition, r.location, r.building, r.mode,
       r.tags, JSON.stringify(r.specifications), Math.floor(Math.random() * 8)]
    );
    resourceIds.push(r.id);
  }

  // Sample requirements
  const requirements = [
    { user: 'arjun@campusloop.edu', raw: 'I need a microcontroller with Wi-Fi for an IoT project for 10 days', category: 'electronics', type: 'microcontroller', duration: 10 },
    { user: 'priya@campusloop.edu', raw: 'Looking for algorithms textbook for semester exam prep', category: 'books', type: 'textbook', duration: 30 },
    { user: 'rahul@campusloop.edu', raw: 'I need a digital multimeter for my electronics lab project', category: 'electronics', type: 'multimeter', duration: 7 },
    { user: 'karan@campusloop.edu', raw: 'Need a laptop charger, USB-C, my charger is broken', category: 'computing', type: 'charger', duration: 3 },
    { user: 'divya@campusloop.edu', raw: 'Temperature and humidity sensor for weather monitoring project', category: 'electronics', type: 'sensor', duration: 14 },
    { user: 'amit@campusloop.edu', raw: 'Need breadboard and jumper wires for circuit lab assignment', category: 'electronics', type: 'prototyping tools', duration: 5 },
    { user: 'neha@campusloop.edu', raw: 'Looking for a camera for college fest coverage this weekend', category: 'events', type: 'camera', duration: 2 },
    { user: 'harsh@campusloop.edu', raw: 'Need projector for final year project presentation next week', category: 'events', type: 'projector', duration: 1 },
    { user: 'kavya@campusloop.edu', raw: 'Soldering iron or station for PCB assembly project', category: 'tools', type: 'soldering equipment', duration: 3 },
    { user: 'isha@campusloop.edu', raw: 'Raspberry Pi or similar SBC for computer vision project', category: 'electronics', type: 'single-board computer', duration: 21 },
    { user: 'siddharth@campusloop.edu', raw: 'Need oscilloscope for analyzing digital signals in mini project', category: 'laboratory', type: 'oscilloscope', duration: 7 },
    { user: 'pooja@campusloop.edu', raw: 'Looking for engineering mathematics book by Grewal', category: 'books', type: 'textbook', duration: 14 },
    { user: 'deepak@campusloop.edu', raw: 'Whiteboard needed for startup pitch preparation session', category: 'furniture', type: 'whiteboard', duration: 2 },
    { user: 'rohit@campusloop.edu', raw: 'Vernier caliper or digital caliper for measurement lab', category: 'tools', type: 'measuring instrument', duration: 3 },
    { user: 'karan@campusloop.edu', raw: 'Multiple sensors for smart irrigation system project — soil moisture, temperature, relay', category: 'electronics', type: 'sensor kit', duration: 20 }
  ];

  const reqIds: string[] = [];
  for (const req of requirements) {
    const res = await query(
      `INSERT INTO requirements (user_id, raw_query, structured_data, category, resource_type, duration_days, urgency, status)
       VALUES ($1,$2,$3,$4,$5,$6,'normal','active') RETURNING id`,
      [userIds[req.user], req.raw, JSON.stringify({ category: req.category, resource_type: req.type, raw_query: req.raw }),
       req.category, req.type, req.duration]
    );
    if (res.rows[0]) reqIds.push(res.rows[0].id);
  }

  // Sample completed loans
  const completedLoans = [
    { resource: 0, borrower: 'arjun@campusloop.edu', owner: 'lab.manager@campusloop.edu' },
    { resource: 1, borrower: 'priya@campusloop.edu', owner: 'arjun@campusloop.edu' },
    { resource: 2, borrower: 'karan@campusloop.edu', owner: 'faculty.cs@campusloop.edu' },
    { resource: 4, borrower: 'sneha@campusloop.edu', owner: 'sneha@campusloop.edu' },
    { resource: 5, borrower: 'rahul@campusloop.edu', owner: 'arjun@campusloop.edu' },
    { resource: 10, borrower: 'kavya@campusloop.edu', owner: 'priya@campusloop.edu' },
    { resource: 11, borrower: 'neha@campusloop.edu', owner: 'deepak@campusloop.edu' },
    { resource: 8, borrower: 'siddharth@campusloop.edu', owner: 'lab.manager@campusloop.edu' },
    { resource: 15, borrower: 'isha@campusloop.edu', owner: 'faculty.cs@campusloop.edu' },
    { resource: 3, borrower: 'amit@campusloop.edu', owner: 'lab.manager@campusloop.edu' }
  ];

  for (const loan of completedLoans) {
    if (!resourceIds[loan.resource]) continue;
    const loanRes = await query(
      `INSERT INTO loans (resource_id, borrower_id, owner_id, status, quantity, actual_start, actual_end,
        handover_verified_at, return_verified_at, qr_handover_code, qr_return_code)
       VALUES ($1,$2,$3,'returned',1,NOW() - INTERVAL '10 days',NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '10 days',NOW() - INTERVAL '2 days',$4,$5)
       RETURNING id`,
      [resourceIds[loan.resource], userIds[loan.borrower], userIds[loan.owner], uuidv4(), uuidv4()]
    );

    if (loanRes.rows[0]) {
      // Impact record
      await query(
        `INSERT INTO impact_records (loan_id, resource_id, user_id, type, estimated_value, estimated_co2_kg)
         VALUES ($1,$2,$3,'reuse',$4,$5)`,
        [loanRes.rows[0].id, resourceIds[loan.resource], userIds[loan.borrower],
         300 + Math.random() * 1500, (300 + Math.random() * 1500) * 0.001]
      );

      // Review
      await query(
        `INSERT INTO reviews (loan_id, reviewer_id, reviewee_id, resource_id, rating, comment, condition_accuracy, type)
         VALUES ($1,$2,$3,$4,$5,$6,5,'owner_review')`,
        [loanRes.rows[0].id, userIds[loan.borrower], userIds[loan.owner], resourceIds[loan.resource],
         4 + Math.round(Math.random()),
         ['Great resource, exactly what I needed!', 'In excellent condition. Would borrow again.',
          'Very helpful owner, smooth handover.', 'Perfect for my project needs.'][Math.floor(Math.random() * 4)]]
      );
    }
  }

  // Active loans
  const activeLoans = [
    { resource: 6, borrower: 'deepak@campusloop.edu', owner: 'deepak@campusloop.edu' },
    { resource: 12, borrower: 'neha@campusloop.edu', owner: 'arjun@campusloop.edu' }
  ];

  for (const loan of activeLoans) {
    if (!resourceIds[loan.resource]) continue;
    await query(
      `INSERT INTO loans (resource_id, borrower_id, owner_id, status, quantity, actual_start,
        qr_handover_code, qr_return_code, handover_verified_at)
       VALUES ($1,$2,$3,'active',1,NOW() - INTERVAL '3 days',$4,$5,NOW() - INTERVAL '3 days')`,
      [resourceIds[loan.resource], userIds[loan.borrower], userIds[loan.owner], uuidv4(), uuidv4()]
    );
  }

  // Update borrow counts
  for (const r of resources) {
    const count = Math.floor(Math.random() * 12);
    await query('UPDATE resources SET borrow_count = $1 WHERE id = $2', [count, r.id]);
  }

  // Notifications
  const notifications = [
    { user: 'arjun@campusloop.edu', type: 'new_match', title: 'New Match Found', message: 'Your request for a microcontroller matched 3 campus resources!' },
    { user: 'priya@campusloop.edu', type: 'request_approved', title: 'Request Approved', message: 'Your request for the Arduino Uno kit has been approved.' },
    { user: 'lab.manager@campusloop.edu', type: 'request_received', title: 'New Request', message: 'Siddharth Patel requested the oscilloscope.' },
    { user: 'admin@campusloop.edu', type: 'underutilized_resource', title: 'Underutilized Asset Alert', message: 'The signal generator has been idle for 45 days with 2 active requests.' }
  ];

  for (const notif of notifications) {
    await query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES ($1,$2,$3,$4)',
      [userIds[notif.user], notif.type, notif.title, notif.message]
    );
  }

  console.log('✅ Seed complete!');
  console.log(`
📊 Seeded:
  • ${departments.length} departments
  • ${categories.length} categories
  • ${users.length} users (password: Demo@1234)
  • ${resources.length} resources
  • ${requirements.length} requirements
  • ${completedLoans.length} completed loans
  • ${docs.length} knowledge documents
  
🔑 Demo accounts:
  Admin: admin@campusloop.edu / Demo@1234
  Student: arjun@campusloop.edu / Demo@1234
  Faculty: faculty.cs@campusloop.edu / Demo@1234
  `);

  await pool.end();
}

function chunkText(text: string, maxLength: number): string[] {
  const sentences = text.split(/[.!?]\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
