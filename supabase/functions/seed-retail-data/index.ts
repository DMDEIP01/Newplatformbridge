import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Seeding retail portal data...");

    // Create mock role-based users
    const mockAgents = [
      {
        email: "retailagent@mediamarkt.ie",
        password: "Test123456!",
        full_name: "James Ryan (Retail Agent)",
        role: "retail_agent"
      },
      {
        email: "claimsagent@mediamarkt.ie",
        password: "Test123456!",
        full_name: "Sarah Walsh (Claims Agent)",
        role: "claims_agent"
      },
      {
        email: "agent1@mediamarkt.ie",
        password: "Test123456!",
        full_name: "Emma O'Connor (Complaints Agent)",
        role: "complaints_agent"
      },
      {
        email: "agent2@mediamarkt.ie",
        password: "Test123456!",
        full_name: "Liam Murphy (Complaints Agent)",
        role: "complaints_agent"
      },
      {
        email: "agent3@mediamarkt.ie",
        password: "Test123456!",
        full_name: "Sophie Kelly (Complaints Agent)",
        role: "complaints_agent"
      },
      {
        email: "admin@mediamarkt.ie",
        password: "Test123456!",
        full_name: "Michael Brennan (Program Admin)",
        role: "admin"
      }
    ];

    let agentsCreated = 0;
    for (const agent of mockAgents) {
      const { data: agentData, error: agentError } = await supabase.auth.admin.createUser({
        email: agent.email,
        password: agent.password,
        email_confirm: true,
        user_metadata: {
          full_name: agent.full_name
        }
      });

      if (agentError) {
        console.log(`Agent ${agent.email} may already exist, skipping...`);
        continue;
      }

      if (agentData.user) {
        await supabase.from("user_roles").insert({
          user_id: agentData.user.id,
          role: agent.role
        });
        agentsCreated++;
        console.log(`Created agent: ${agent.full_name}`);
      }
    }

    // Create mock repairer companies across EU
    const mockRepairers = [
      {
        name: "Hans Müller",
        company_name: "MediaMarkt Reparatur Service DE",
        contact_email: "service@mm-repair.de",
        contact_phone: "+49 89 1234 5678",
        address_line1: "Leopoldstraße 123",
        address_line2: "Gebäude B",
        city: "München",
        postcode: "80802",
        coverage_areas: ["Bayern", "Baden-Württemberg", "Hessen"],
        specializations: ["Smartphones", "Tablets", "Laptops", "Smart TVs", "Haushaltsgeräte"],
        connectivity_type: "EIP API"
      },
      {
        name: "Sophie Dubois",
        company_name: "MediaMarkt Réparation FR",
        contact_email: "reparation@mm-repair.fr",
        contact_phone: "+33 1 45 67 89 01",
        address_line1: "25 Avenue des Champs-Élysées",
        address_line2: "Porte 3",
        city: "Paris",
        postcode: "75008",
        coverage_areas: ["Île-de-France", "Hauts-de-France", "Grand Est"],
        specializations: ["Électroménager", "TV", "Audio", "Smartphones"],
        connectivity_type: "EIP Portal"
      },
      {
        name: "Marco Rossi",
        company_name: "MediaMarkt Riparazione IT",
        contact_email: "riparazione@mm-repair.it",
        contact_phone: "+39 02 1234 5678",
        address_line1: "Via Roma 45",
        address_line2: "Piano 2",
        city: "Milano",
        postcode: "20121",
        coverage_areas: ["Lombardia", "Piemonte", "Veneto"],
        specializations: ["Elettrodomestici", "Computer", "Televisori", "Smartphone"],
        connectivity_type: "Repairer API"
      },
      {
        name: "Jan de Vries",
        company_name: "MediaMarkt Reparatie NL",
        contact_email: "reparatie@mm-repair.nl",
        contact_phone: "+31 20 123 4567",
        address_line1: "Kalverstraat 101",
        city: "Amsterdam",
        postcode: "1012 PA",
        coverage_areas: ["Noord-Holland", "Zuid-Holland", "Utrecht"],
        specializations: ["Witgoed", "Bruingoed", "Computers", "Telefoons"],
        connectivity_type: "EIP SFTP"
      },
      {
        name: "Carlos García",
        company_name: "MediaMarkt Reparación ES",
        contact_email: "reparacion@mm-repair.es",
        contact_phone: "+34 91 234 5678",
        address_line1: "Calle Gran Vía 28",
        address_line2: "Planta 3",
        city: "Madrid",
        postcode: "28013",
        coverage_areas: ["Madrid", "Cataluña", "Andalucía"],
        specializations: ["Electrodomésticos", "Informática", "Telefonía", "Televisores"],
        connectivity_type: "EIP Portal"
      },
      {
        name: "Anna Kowalska",
        company_name: "MediaMarkt Naprawa PL",
        contact_email: "naprawa@mm-repair.pl",
        contact_phone: "+48 22 123 4567",
        address_line1: "ul. Marszałkowska 104",
        city: "Warszawa",
        postcode: "00-017",
        coverage_areas: ["Mazowieckie", "Małopolskie", "Śląskie"],
        specializations: ["AGD", "RTV", "Komputery", "Telefony"],
        connectivity_type: "Repairer SFTP"
      },
      {
        name: "Lars Andersson",
        company_name: "MediaMarkt Reparation SE",
        contact_email: "reparation@mm-repair.se",
        contact_phone: "+46 8 123 456 78",
        address_line1: "Drottninggatan 56",
        city: "Stockholm",
        postcode: "111 21",
        coverage_areas: ["Stockholm", "Västra Götaland", "Skåne"],
        specializations: ["Vitvaror", "Elektronik", "Datorer", "Mobiler"],
        connectivity_type: "Repairer API"
      },
      {
        name: "Maria Silva",
        company_name: "MediaMarkt Reparação PT",
        contact_email: "reparacao@mm-repair.pt",
        contact_phone: "+351 21 123 4567",
        address_line1: "Avenida da Liberdade 180",
        city: "Lisboa",
        postcode: "1250-146",
        coverage_areas: ["Lisboa", "Porto", "Coimbra"],
        specializations: ["Eletrodomésticos", "Informática", "TV", "Smartphones"],
        connectivity_type: "EIP SFTP"
      }
    ];

    console.log("Creating repairer companies...");
    const repairersCreated = [];
    
    for (const repairer of mockRepairers) {
      const { data: repairerData, error: repairerError } = await supabase
        .from("repairers")
        .insert({
          name: repairer.name,
          company_name: repairer.company_name,
          contact_email: repairer.contact_email,
          contact_phone: repairer.contact_phone,
          address_line1: repairer.address_line1,
          address_line2: repairer.address_line2,
          city: repairer.city,
          postcode: repairer.postcode,
          coverage_areas: repairer.coverage_areas,
          specializations: repairer.specializations,
          connectivity_type: repairer.connectivity_type,
          is_active: true
        })
        .select()
        .single();

      if (repairerError) {
        console.log(`Error creating repairer ${repairer.company_name}:`, repairerError);
        continue;
      }

      if (repairerData) {
        repairersCreated.push(repairerData);
        console.log(`Created repairer: ${repairer.company_name}`);

        // Create SLAs for this repairer
        const slaCategories = ["Smartphones", "Laptops", "Tablets", "Smartwatches"];
        for (const category of slaCategories) {
          if (repairer.specializations?.includes(category)) {
            const { error: slaError } = await supabase
              .from("repairer_slas")
              .insert({
                repairer_id: repairerData.id,
                device_category: category,
                response_time_hours: Math.floor(Math.random() * 24) + 12, // 12-36 hours
                repair_time_hours: Math.floor(Math.random() * 48) + 24, // 24-72 hours
                availability_hours: "9am-6pm Mon-Fri",
                quality_score: (Math.random() * 2 + 3).toFixed(2), // 3.00-5.00
                success_rate: (Math.random() * 20 + 80).toFixed(2), // 80-100%
                notes: `Specialized in ${category} repairs with certified technicians`
              });
            
            if (!slaError) {
              console.log(`Created SLA for ${category}`);
            }
          }
        }

        // Create a user account for this repairer
        const repairerEmail = repairer.contact_email.replace('@', '+agent@');
        const { data: repairerUser, error: repairerUserError } = await supabase.auth.admin.createUser({
          email: repairerEmail,
          password: "Test123456!",
          email_confirm: true,
          user_metadata: {
            full_name: `${repairer.name} (${repairer.company_name})`
          }
        });

        if (repairerUserError) {
          console.log(`Repairer user ${repairerEmail} may already exist, skipping...`);
        } else if (repairerUser.user) {
          // Add repairer_agent role
          await supabase.from("user_roles").insert({
            user_id: repairerUser.user.id,
            role: "repairer_agent"
          });

          // Link user to repairer company
          await supabase.from("profiles")
            .update({ repairer_id: repairerData.id })
            .eq("id", repairerUser.user.id);

          console.log(`Created repairer user: ${repairerEmail}`);
        }
      }
    }

    console.log(`Created ${repairersCreated.length} repairer companies with user accounts`);

    // Mock customer data
    const mockCustomers = [
      {
        email: "john.smith@email.com",
        password: "Test123456!",
        full_name: "John Smith",
        phone: "+353 87 123 4567",
        address_line1: "123 Main Street",
        city: "Dublin",
        postcode: "D01 X1Y2"
      },
      {
        email: "mary.johnson@email.com",
        password: "Test123456!",
        full_name: "Mary Johnson",
        phone: "+353 86 234 5678",
        address_line1: "45 High Street",
        city: "Cork",
        postcode: "T12 AB34"
      },
      {
        email: "james.williams@email.com",
        password: "Test123456!",
        full_name: "James Williams",
        phone: "+353 85 345 6789",
        address_line1: "78 Park Avenue",
        city: "Galway",
        postcode: "H91 CD56"
      },
      {
        email: "sarah.brown@email.com",
        password: "Test123456!",
        full_name: "Sarah Brown",
        phone: "+353 89 456 7890",
        address_line1: "22 Church Road",
        city: "Limerick",
        postcode: "V94 EF78"
      },
      {
        email: "michael.davis@email.com",
        password: "Test123456!",
        full_name: "Michael Davis",
        phone: "+353 87 567 8901",
        address_line1: "99 Green Lane",
        city: "Waterford",
        postcode: "X91 GH90"
      }
    ];

    // Get product IDs
    const { data: products } = await supabase
      .from("products")
      .select("id, name, type, excess, monthly_premium");

    if (!products || products.length === 0) {
      throw new Error("No products found in database");
    }

    const extendedWarranty = products.find(p => p.type === "extended_warranty");
    const insuranceLite = products.find(p => p.type === "insurance_lite");
    const insuranceMax = products.find(p => p.type === "insurance_max");

    let createdCount = 0;

    // Create each customer with policies and covered items
    for (const customer of mockCustomers) {
      // Create user account
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: customer.email,
        password: customer.password,
        email_confirm: true,
        user_metadata: {
          full_name: customer.full_name
        }
      });

      if (userError) {
        console.log(`User ${customer.email} may already exist, skipping...`);
        continue;
      }

      if (!userData.user) continue;

      const userId = userData.user.id;
      console.log(`Created user: ${customer.full_name}`);

      // Update profile with full details
      await supabase
        .from("profiles")
        .update({
          phone: customer.phone,
          address_line1: customer.address_line1,
          city: customer.city,
          postcode: customer.postcode
        })
        .eq("id", userId);

      // Add customer role
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "customer"
      });

      // Create 1-2 policies per customer
      const customerPolicies = [];
      
      // First policy - Extended Warranty or Insurance Lite
      const firstProduct = Math.random() > 0.5 ? extendedWarranty : insuranceLite;
      if (firstProduct) {
        const { data: policy1 } = await supabase
          .from("policies")
          .insert({
            user_id: userId,
            product_id: firstProduct.id,
            policy_number: `POL-2024-${Math.floor(10000 + Math.random() * 90000)}`,
            status: "active",
            start_date: "2024-01-15",
            renewal_date: "2025-01-15",
          })
          .select()
          .single();

        if (policy1) {
          customerPolicies.push(policy1);
          
          // Add covered item for first policy
          const items = [
            { name: 'Samsung 55" QLED TV', model: "QE55Q80B", serial: `SN${Math.floor(100000 + Math.random() * 900000)}`, price: 1299.00 },
            { name: "Apple iPhone 15 Pro", model: "A2848", serial: `IMEI${Math.floor(100000000000 + Math.random() * 900000000000)}`, price: 1199.00 },
            { name: "Dell XPS 15 Laptop", model: "9530", serial: `SN${Math.floor(100000 + Math.random() * 900000)}`, price: 1899.00 },
            { name: "Bosch Washing Machine", model: "WAU28T64GB", serial: `SN${Math.floor(100000 + Math.random() * 900000)}`, price: 649.00 },
            { name: "Samsung Galaxy Tab S9", model: "SM-X710", serial: `SN${Math.floor(100000 + Math.random() + 900000)}`, price: 799.00 }
          ];
          
          const randomItem = items[Math.floor(Math.random() * items.length)];
          await supabase.from("covered_items").insert({
            policy_id: policy1.id,
            product_name: randomItem.name,
            model: randomItem.model,
            serial_number: randomItem.serial,
            purchase_price: randomItem.price,
          });
        }
      }

      // Second policy - 60% chance (Insurance Max)
      if (Math.random() > 0.4 && insuranceMax) {
        const { data: policy2 } = await supabase
          .from("policies")
          .insert({
            user_id: userId,
            product_id: insuranceMax.id,
            policy_number: `POL-2024-${Math.floor(10000 + Math.random() * 90000)}`,
            status: "active",
            start_date: "2024-03-01",
            renewal_date: "2025-03-01",
          })
          .select()
          .single();

        if (policy2) {
          customerPolicies.push(policy2);
          
          // Add covered item for second policy
          const items = [
            { name: "Sony PlayStation 5", model: "CFI-1216A", serial: `SN${Math.floor(100000 + Math.random() * 900000)}`, price: 549.00 },
            { name: "LG 65\" OLED TV", model: "OLED65C3", serial: `SN${Math.floor(100000 + Math.random() * 900000)}`, price: 2199.00 },
            { name: "MacBook Pro 16\"", model: "M3 Pro", serial: `SN${Math.floor(100000 + Math.random() * 900000)}`, price: 2899.00 }
          ];
          
          const randomItem = items[Math.floor(Math.random() * items.length)];
          await supabase.from("covered_items").insert({
            policy_id: policy2.id,
            product_name: randomItem.name,
            model: randomItem.model,
            serial_number: randomItem.serial,
            purchase_price: randomItem.price,
          });
        }
      }

      // Add some claims (30% chance per policy)
      for (const policy of customerPolicies) {
        if (Math.random() > 0.7) {
          const claimTypes = ["breakdown", "damage", "theft"];
          const claimStatuses = ["notified", "accepted", "repair", "completed"];
          const randomType = claimTypes[Math.floor(Math.random() * claimTypes.length)];
          const randomStatus = claimStatuses[Math.floor(Math.random() * claimStatuses.length)];
          
          await supabase.from("claims").insert({
            policy_id: policy.id,
            user_id: userId,
            claim_number: `CLM-2024-${Math.floor(10000 + Math.random() * 90000)}`,
            claim_type: randomType,
            status: randomStatus,
            product_condition: "moderate",
            description: `${randomType === "breakdown" ? "Device malfunction" : randomType === "damage" ? "Accidental damage" : "Theft incident"}`,
            has_receipt: true,
            decision: randomStatus === "notified" ? null : "accepted",
            decision_reason: randomStatus === "notified" ? null : "Valid claim with documentation",
          });
        }
      }

      createdCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${agentsCreated} complaints agents and ${createdCount} mock customers with policies and covered items`,
        agentsCreated,
        customersCreated: createdCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error seeding retail data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
