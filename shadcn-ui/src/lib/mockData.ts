import { Carrier, Customer, Shipment, LoadType, Location, Review, Notification, PricingFactors, Offer } from '@/lib/types';

export const mockCarriers: Carrier[] = [
  
  {
    id: '2',
    email: 'mehmet@example.com',
    phone: '+905559876543',
    name: 'Mehmet',
    surname: 'Demir',
    city: 'Ankara',
    password: 'mehmet456',
    type: 'carrier',
    createdAt: new Date('2024-02-01'),
    vehicle: {
      id: 'v2',
      type: 'kamyon',
      capacity: 15000,
      licensePlate: '06 XYZ 789',
      documents: [],
      photo: '/api/placeholder/400/300',
      year: 2019,
      brand: 'Mercedes',
      model: 'Atego'
    },
  serviceAreas: ['Ankara', 'Konya', 'Kayseri'],
  startYear: 2017,
  scopes: ['sehirici', 'sehirlerarasi'],
    loadTypes: ['makina', 'hassas-yuk'],
    documents: {
      license: 'license_2.pdf',
      src: 'src_2.pdf',
      kBelgesi: 'k_belgesi_2.pdf'
    },
    rating: 4.6,
    reviewCount: 89,
    isApproved: true,
    baseFee: 300,
    profilePhoto: '/api/placeholder/150/150',
    description: 'Ağır yük ve hassas malzeme taşımacılığında 8 yıllık tecrübem var. Profesyonel ekipmanlarla güvenli taşıma.',
    experience: 8,
    badges: ['Hassas Yük Uzmanı', 'Profesyonel']
  },
  {
    id: '3',
    email: 'fatma@example.com',
    phone: '+905557654321',
    name: 'Fatma',
    surname: 'Kaya',
    city: 'İzmir',
    password: 'fatma789',
    type: 'carrier',
    createdAt: new Date('2024-03-10'),
    vehicle: {
      id: 'v3',
      type: 'kamyonet',
      capacity: 2500,
      licensePlate: '35 FGH 456',
      documents: [],
      photo: '/api/placeholder/400/300',
      year: 2021,
      brand: 'Volkswagen',
      model: 'Crafter'
    },
  serviceAreas: ['İzmir', 'Manisa', 'Aydın'],
  startYear: 2019,
  scopes: ['sehirici'],
    loadTypes: ['gida', 'tekstil'],
    documents: {
      license: 'license_3.pdf',
      src: 'src_3.pdf',
      kBelgesi: 'k_belgesi_3.pdf'
    },
    rating: 4.9,
    reviewCount: 156,
    isApproved: true,
    baseFee: 120,
    profilePhoto: '/api/placeholder/150/150',
    description: 'Gıda ve tekstil ürünleri taşımacılığında uzmanım. Soğuk zincir taşımacılık imkanım mevcut.',
    experience: 6,
    badges: ['Altın Taşıyıcı', 'Soğuk Zincir', 'Kadın Girişimci']
  }
  ,
  {
    id: '4',
    email: 'demo@tasiburada.com',
    phone: '+905550000000',
    name: 'Demo',
    surname: 'Lojistik',
    city: 'İstanbul',
    password: 'demo123',
    type: 'carrier',
    createdAt: new Date('2024-09-01'),
    vehicle: {
      id: 'v4',
      type: 'kamyonet',
      capacity: 3500,
      licensePlate: '34 DEM 034',
      documents: [],
      photo: '/api/placeholder/400/300',
      year: 2022,
      brand: 'Fiat',
      model: 'Ducato'
    },
  serviceAreas: ['İstanbul', 'Ankara', 'İzmir'],
  startYear: 2020,
  scopes: ['sehirici', 'sehirlerarasi'],
    loadTypes: ['ev-esyasi', 'mobilya', 'beyaz-esya'],
    documents: {
      license: 'license_demo.pdf',
      src: 'src_demo.pdf',
      kBelgesi: 'k_belgesi_demo.pdf'
    },
    rating: 4.7,
    reviewCount: 42,
    isApproved: true,
    baseFee: 180,
    profilePhoto: '/api/placeholder/150/150',
    description: 'Demo şirket hesabı - platform tanıtımları için.',
    experience: 5,
    badges: ['Doğrulanmış']
  }
];

export const mockCustomers: Customer[] = [
  {
    id: 'c1',
    email: 'customer1@example.com',
    phone: '+905551111111',
    name: 'Fatma',
    surname: 'Özkan',
    city: 'İstanbul',
    password: 'customer123',
    type: 'customer',
    createdAt: new Date('2024-03-01')
  },
  {
    id: 'c2',
    email: 'eren@gmail.com',
    phone: '+905552222222',
    name: 'Eren',
    surname: 'Serinyel',
    city: 'İstanbul',
    password: 'ues2141',
    type: 'customer',
    createdAt: new Date('2024-01-01')
  }
];

export const mockShipments: Shipment[] = [
  {
    id: 's1',
    customerId: 'c1',
    origin: {
      address: 'Kadıköy, İstanbul',
      lat: 40.9833,
      lng: 29.0167,
      city: 'İstanbul'
    },
    destination: {
      address: 'Çankaya, Ankara',
      lat: 39.9208,
      lng: 32.8541,
      city: 'Ankara'
    },
    loadType: 'ev-esyasi' as LoadType,
    weight: 500,
    date: new Date('2024-09-25'),
    description: '2+1 ev eşyası taşıma',
    requestedDate: new Date('2024-09-25'),
    price: 850,
    distance: 450,
    status: 'pending',
    createdAt: new Date('2024-09-19'),
    estimatedDuration: 6,
    specialRequirements: ['Dikkatli taşıma', 'Montaj yardımı']
  },
  {
    id: 's2',
    customerId: 'c1',
    origin: {
      address: 'Beşiktaş, İstanbul',
      lat: 41.0422,
      lng: 29.0033,
      city: 'İstanbul'
    },
    destination: {
      address: 'Konak, İzmir',
      lat: 38.4192,
      lng: 27.1287,
      city: 'İzmir'
    },
    loadType: 'elektronik' as LoadType,
    weight: 150,
    date: new Date('2024-09-28'),
    description: 'Bilgisayar ve elektronik eşya',
    requestedDate: new Date('2024-09-28'),
    price: 650,
    distance: 340,
    status: 'pending',
    createdAt: new Date('2024-09-20'),
    estimatedDuration: 5,
    specialRequirements: ['Ambalajlı taşıma', 'Sigortalı']
  }
];

export const mockReviews: Review[] = [
  {
    id: 'r1',
    shipmentId: 's1',
    reviewerId: 'c1',
    revieweeId: '4',
    rating: 5,
    comment: 'Çok memnun kaldım. Eşyalarımı özenle taşıdı, zamanında geldi. Kesinlikle tavsiye ederim.',
    createdAt: new Date('2024-09-15'),
    helpful: 12,
    categories: {
      punctuality: 5,
      communication: 5,
      carefulHandling: 5,
      professionalism: 5
    }
  },
  {
    id: 'r2',
    shipmentId: 's2',
    reviewerId: 'c1',
    revieweeId: '2',
    rating: 4,
    comment: 'İyi bir hizmet aldım. Sadece iletişim biraz daha iyi olabilirdi.',
    createdAt: new Date('2024-09-10'),
    helpful: 8,
    categories: {
      punctuality: 4,
      communication: 3,
      carefulHandling: 5,
      professionalism: 4
    }
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'c1',
    type: 'offer_received',
    title: 'Yeni Teklif Geldi',
    message: 'Demo Lojistik taşıma talebiniz için 850₺ teklif verdi.',
    isRead: false,
    createdAt: new Date('2024-09-22'),
    relatedId: 's1',
    actionUrl: '/offers/s1'
  },
  {
    id: 'n2',
    userId: '4',
    type: 'offer_accepted',
    title: 'Teklifiniz Kabul Edildi',
    message: 'Fatma Özkan teklifinizi kabul etti. İletişime geçebilirsiniz.',
    isRead: false,
    createdAt: new Date('2024-09-21'),
    relatedId: 's1',
    actionUrl: '/shipments'
  }
];

// Enhanced pricing calculation with multiple factors
export const calculateAdvancedPrice = (
  distance: number, 
  weight: number, 
  vehicleType: string, 
  baseFee: number,
  requestedDate: Date,
  loadType: LoadType
): { price: number; factors: PricingFactors } => {
  const now = new Date();
  const daysUntilPickup = Math.ceil((requestedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Base rates by vehicle type
  const kmRates = {
    'kamyonet': 2.0,
    'kamyon': 2.5,
    'tir': 3.0
  };
  
  // Demand multiplier based on load type popularity
  const demandMultipliers = {
    'ev-esyasi': 1.2,
    'mobilya': 1.1,
    'elektronik': 1.3,
    'hassas-yuk': 1.4,
    'gida': 1.0,
    'tekstil': 0.9,
    'makina': 1.3,
    'inşaat-malzemesi': 0.8,
    'otomotiv-parca': 1.1,
    'beyaz-esya': 1.2
  };
  
  // Traffic multiplier (mock - would be real-time in production)
  const trafficMultiplier = 1.0 + (Math.random() * 0.3); // 1.0-1.3
  
  // Urgency multiplier based on requested date
  let urgencyMultiplier = 1.0;
  if (daysUntilPickup <= 1) urgencyMultiplier = 1.5;
  else if (daysUntilPickup <= 3) urgencyMultiplier = 1.3;
  else if (daysUntilPickup <= 7) urgencyMultiplier = 1.1;
  
  // Seasonal multiplier (mock)
  const month = requestedDate.getMonth();
  const seasonalMultiplier = (month >= 5 && month <= 8) ? 1.1 : 0.95; // Summer premium
  
  const factors: PricingFactors = {
    baseRate: kmRates[vehicleType as keyof typeof kmRates] || 2.0,
    distanceMultiplier: 1.0,
    weightMultiplier: 0.5,
    demandMultiplier: demandMultipliers[loadType] || 1.0,
    trafficMultiplier,
    urgencyMultiplier,
    seasonalMultiplier
  };
  
  const basePrice = baseFee + (distance * factors.baseRate) + (weight * factors.weightMultiplier);
  const finalPrice = Math.round(
    basePrice * 
    factors.demandMultiplier * 
    factors.trafficMultiplier * 
    factors.urgencyMultiplier * 
    factors.seasonalMultiplier
  );
  
  return { price: finalPrice, factors };
};

// Legacy function for backward compatibility
export const calculatePrice = (
  distance: number, 
  weight: number, 
  vehicleType: string, 
  baseFee: number
): number => {
  const kmRate = vehicleType === 'tir' ? 3 : vehicleType === 'kamyon' ? 2.5 : 2;
  const weightRate = 0.5;
  
  return Math.round(baseFee + (distance * kmRate) + (weight * weightRate));
};

// Mock function to simulate distance calculation
export const calculateDistance = (origin: Location, destination: Location): number => {
  // Simple mock calculation - in real app would use Google Maps API
  return Math.round(Math.random() * 500 + 100);
};

// Generate mock offers for a shipment
export const generateMockOffers = (shipmentId: string, shipment: Shipment): Offer[] => {
  const suitableCarriers = mockCarriers.filter(carrier => 
    carrier.serviceAreas.includes(shipment.origin.city) &&
    carrier.serviceAreas.includes(shipment.destination.city) &&
    carrier.loadTypes.includes(shipment.loadType) &&
    carrier.vehicle.capacity >= shipment.weight
  );
  
  return suitableCarriers.map(carrier => {
    const pricing = calculateAdvancedPrice(
      shipment.distance,
      shipment.weight,
      carrier.vehicle.type,
      carrier.baseFee,
      shipment.requestedDate,
      shipment.loadType
    );
    
    // Add some variation to prices
    const priceVariation = 0.9 + (Math.random() * 0.2); // ±10%
    const finalPrice = Math.round(pricing.price * priceVariation);
    
    return {
      id: `offer_${shipmentId}_${carrier.id}`,
      shipmentId,
      carrierId: carrier.id,
      price: finalPrice,
      message: `${shipment.loadType} taşımacılığında deneyimliyim. Güvenli ve zamanında teslimat garantisi veriyorum.`,
      estimatedDuration: Math.ceil(shipment.distance / 75), // Rough estimate: 75km/h average
      status: 'pending',
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      carrier
    };
  });
};

// Functions to add new users to mock data
export const addNewCustomer = (customerData: Omit<Customer, 'id'>) => {
  const newCustomer: Customer = {
    ...customerData,
    id: `c${Date.now()}`, // Generate unique ID
  };
  
  mockCustomers.push(newCustomer);
  
  // Save to localStorage for persistence
  localStorage.setItem('mockCustomers', JSON.stringify(mockCustomers));
  
  return newCustomer;
};

export const addNewCarrier = (carrierData: Omit<Carrier, 'id' | 'rating' | 'reviewCount' | 'isApproved' | 'badges'>) => {
  const newCarrier: Carrier = {
    ...carrierData,
    id: Date.now().toString(),
    rating: 0, // New carriers start with 0 rating
    reviewCount: 0,
    isApproved: false, // New carriers need approval
    badges: [], // No badges initially
  };
  
  mockCarriers.push(newCarrier);
  
  // Save to localStorage for persistence
  localStorage.setItem('mockCarriers', JSON.stringify(mockCarriers));
  
  return newCarrier;
};

// Load data from localStorage on app start
const loadStoredData = () => {
  const storedCustomers = localStorage.getItem('mockCustomers');
  if (storedCustomers) {
    const customers = JSON.parse(storedCustomers);
    // Sadece yeni kayıtları ekle, mevcut olanları değiştirme
    customers.forEach((customer: Customer) => {
      if (!mockCustomers.find(c => c.id === customer.id)) {
        mockCustomers.push(customer);
      }
    });
  }
  
  const storedCarriers = localStorage.getItem('mockCarriers');
  if (storedCarriers) {
    const carriers = JSON.parse(storedCarriers);
    // Sadece yeni kayıtları ekle, mevcut olanları değiştirme
    carriers.forEach((carrier: Carrier) => {
      if (!mockCarriers.find(c => c.id === carrier.id)) {
        mockCarriers.push(carrier);
      }
    });
  }
};

// Initialize stored data
loadStoredData();