/**
 * Supabase Realtime Test Script
 * 
 * This script:
 * 1. Creates a test appointment via Prisma
 * 2. Waits for Realtime event
 * 3. Verifies the appointment was created
 * 4. Cleans up the test data
 * 
 * Usage: npx tsx scripts/test-realtime.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRealtime() {
  console.log('🧪 Testing Supabase Realtime for appointments queue...\n')

  // Step 1: Get or create a test clinic
  console.log('📡 Connecting to Supabase...')
  const { data: clinic, error: clinicError } = await supabase
    .from('Clinic')
    .select('id')
    .limit(1)
    .single()

  if (clinicError || !clinic) {
    console.error('❌ No clinic found. Create a clinic first.')
    console.error('   Error:', clinicError)
    process.exit(1)
  }

  const clinicId = clinic.id
  console.log(`✅ Connected. Clinic ID: ${clinicId}\n`)

  // Step 2: Subscribe to Realtime channel
  console.log('📡 Subscribing to Realtime channel...')
  
  let receivedEvents: any[] = []
  
  const channel = supabase
    .channel(`test-realtime:${clinicId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `clinicId=eq.${clinicId}`,
      },
      (payload) => {
        console.log(`\n📨 Realtime event received: ${payload.eventType}`)
        console.log('   Event type:', payload.eventType)
        console.log('   Table:', payload.table)
        console.log('   Timestamp:', payload.commit_timestamp)
        
        receivedEvents.push(payload)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to channel\n')
        runTests()
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel error:', status)
        process.exit(1)
      } else if (status === 'TIMED_OUT') {
        console.error('❌ Channel subscription timed out')
        process.exit(1)
      }
    })

  async function runTests() {
    try {
      // Test 1: Create appointment via direct Supabase insert
      console.log('📝 Test 1: Creating test patient...')
      
      const testPatient = {
        clinicId,
        fileNumber: `TEST-${Date.now()}`,
        fullName: 'Realtime Test Patient',
        phone: '01000000000',
        dateOfBirth: new Date('2000-01-01').toISOString(),
        gender: 'MALE',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert(testPatient)
        .select()
        .single()

      if (patientError || !patient) {
        console.error('❌ Failed to create test patient:', patientError)
        throw patientError
      }

      console.log(`✅ Test patient created: ${patient.id}\n`)

      console.log('📝 Test 2: Creating test appointment...')
      
      const now = new Date()
      const testAppointment = {
        clinicId,
        patientId: patient.id,
        date: now.toISOString(),
        startTime: '10:00',
        type: 'procedureCheckup',
        status: 'SCHEDULED',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      const { data: appointment, error: apptError } = await supabase
        .from('appointments')
        .insert(testAppointment)
        .select()
        .single()

      if (apptError || !appointment) {
        console.error('❌ Failed to create test appointment:', apptError)
        throw apptError
      }

      console.log(`✅ Test appointment created: ${appointment.id}`)
      console.log('⏳ Waiting 3 seconds for Realtime events...\n')

      await new Promise(resolve => setTimeout(resolve, 3000))

      // Verify we received the INSERT event
      const insertEvents = receivedEvents.filter(e => e.eventType === 'INSERT')
      if (insertEvents.length === 0) {
        console.warn('⚠️  No INSERT events received via Realtime')
        console.warn('   This likely means Realtime is not enabled on the appointments table')
      } else {
        console.log(`✅ Received ${insertEvents.length} INSERT event(s)\n`)
      }

      // Test 2: Update appointment status
      console.log('📝 Test 3: Updating appointment status to CONFIRMED...')
      
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'CONFIRMED', updatedAt: new Date().toISOString() })
        .eq('id', appointment.id)

      if (updateError) {
        console.error('❌ Failed to update appointment:', updateError)
        throw updateError
      }

      console.log('✅ Status updated to CONFIRMED')
      console.log('⏳ Waiting 3 seconds for Realtime events...\n')

      await new Promise(resolve => setTimeout(resolve, 3000))

      // Verify we received the UPDATE event
      const updateEvents = receivedEvents.filter(e => e.eventType === 'UPDATE')
      if (updateEvents.length === 0) {
        console.warn('⚠️  No UPDATE events received via Realtime')
      } else {
        console.log(`✅ Received ${updateEvents.length} UPDATE event(s)\n`)
      }

      // Summary
      console.log('📊 Realtime Events Summary:')
      console.log(`   INSERT events: ${insertEvents.length}`)
      console.log(`   UPDATE events: ${updateEvents.length}`)
      console.log(`   Total events: ${receivedEvents.length}\n`)

      // Cleanup
      console.log('🧹 Cleaning up test data...')
      
      const { error: deleteApptError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id)

      if (deleteApptError) {
        console.error('⚠️  Failed to delete test appointment:', deleteApptError)
      }

      const { error: deletePatientError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patient.id)

      if (deletePatientError) {
        console.error('⚠️  Failed to delete test patient:', deletePatientError)
      }

      console.log('✅ Cleanup complete\n')

      if (receivedEvents.length > 0) {
        console.log('🎉 Realtime is working correctly!')
        console.log('\n✅ Your appointments queue will update in real-time when:')
        console.log('   • New appointments are booked')
        console.log('   • Appointment statuses change')
        console.log('   • Appointments are cancelled or deleted')
      } else {
        console.log('⚠️  No Realtime events received')
        console.log('\n🔧 Next steps:')
        console.log('   1. Go to Supabase Dashboard → Database → Replication')
        console.log('   2. Find the "appointments" table')
        console.log('   3. Toggle ON "Enable Realtime"')
        console.log('   4. Run this test again')
      }

      // Unsubscribe and exit
      await supabase.removeChannel(channel)
      process.exit(0)
    } catch (err) {
      console.error('\n❌ Test failed:', err)
      await supabase.removeChannel(channel)
      process.exit(1)
    }
  }

  // Timeout after 30 seconds
  setTimeout(() => {
    console.error('\n❌ Test timed out after 30 seconds')
    console.error('\n🔧 Possible issues:')
    console.error('   1. Realtime not enabled on appointments table')
    console.error('   2. RLS policies blocking events')
    console.error('   3. Network connectivity issues')
    console.error('   4. Invalid API key or URL')
    supabase.removeChannel(channel)
    process.exit(1)
  }, 30000)
}

testRealtime().catch(console.error)
