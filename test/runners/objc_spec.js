var expect = require('chai').expect;
var runner = require('../runner');

describe( 'objc runner', function(){
	describe( '.run', function(){
		runner.assertCodeExamples('objc');

		it( 'should handle basic code evaluation', function(done){
			runner.run({
				language: 'objc',
                setup: false,
				code: [
                    '#import <Foundation/Foundation.h>',
                    'int main (int argc, const char * argv[]) {',
					'NSLog(@"Hello World");',
                    'return 0;',
                    '}'
				].join('\n')
			}, function(buffer) {
				console.log("buffer", buffer);
				expect(buffer.stdout).to.contain('Hello World\n');
				done();
			});
		});
		it('should handle basic code setup code', function(done) {
			runner.run({
				language: 'objc',
				setup: 'int foo(void) { return 999; }',
				setupHeader: [
					'int foo(void);'
				].join('\n'),
				code: [
                    '#import <Foundation/Foundation.h>',
                    'int main (int argc, const char * argv[]) {',
                    'NSLog(@"A string: %i", foo());',
                    'return 0;',
                    '}'
				].join('\n')
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stdout).to.contain('999');
				done();
			});
		});		
		it('should handle compile errors', function(done) {
			runner.run({
				language: 'objc',
				setup: 'int foo(void) { return 999; }',
				setupHeader: [
					'int foo(void);'
				].join('\n'),
				code: `
                    #import <Foundation/Foundation.h>
	                    int main (int argc, const char * argv[]) {
	                    NSLog(@"A string: %i", foo(noexists));
	                    return 0;
                    }
                    `
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stderr).to.contain("error: use of undeclared identifier 'noexists'");
				done();
			});
		});
		it('should handle setup code and imports', function(done) {
			runner.run({
				language: 'objc',
				setup: 'int square(int a) { return a * a; }',
				setupHeader: [
					'int square(int a);'
				].join('\n'),
				code: [
                    '#import <Foundation/Foundation.h>',
                    'int main (int argc, const char * argv[]) {',
                    'NSLog(@"Square: %i", square(6));',
                    'return 0;',
                    '}'
				].join('\n')
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stdout).to.contain('Square: 36');
				done();
			});
		});
		it('should handle constructor classes, member functions and static', function(done) {
			runner.run({
				language: 'objc',
				setup: [
                    'static int openAccounts = 0;',
                    '@implementation BankAccount',
                    '+ (BankAccount *) newAlloc {',
                    'openAccounts++;',
                    'return [BankAccount alloc];',
                    '}',
                    '+ (int) totalOpen {',
                    'return openAccounts;',
                    '}',
                    '@end'
                ].join('\n'),
				setupHeader: [
                    '#import <Foundation/Foundation.h>',
                    '@interface BankAccount: NSObject {}',
                    '+ (BankAccount *) newAlloc;',
                    '+ (int) totalOpen;',
                    '@end'
				].join('\n'),
				code: [
                    'int main (int argc, const char * argv[]) {',
                    'NSAutoreleasePool * pool = [[NSAutoreleasePool alloc] init];',
                    'BankAccount *account1, *account2;',
                    'account1 = [[BankAccount newAlloc] init];',
                    'account2 = [[BankAccount newAlloc] init];',
                    'int count = [BankAccount totalOpen];',
                    'NSLog (@"Number of BankAccount instances = %i", count);',
                    '[account1 release];',
                    '[account2 release];',
                    '[pool drain];',
                    'return 0;',
                    '}'
				].join('\n')
			}, function(buffer) {
				//console.log(buffer);
                console.log("buffer.stderr", buffer.stderr.split("\n"));
                expect(buffer.stdout).to.contain('Number of BankAccount instances = 2');
				done();
			});
		});
		it('should handle constructor classes, member functions and instance properties', function(done) {
			runner.run({
				language: 'objc',
				setup: [
                    '@implementation SimpleClass',
                    '@synthesize name;',
                    '@synthesize age;',
                    '- (void)printName {',
                        'NSLog(@"Name: %@ and the age is %d", name, age);',
                    '}',
                    '@end'
                ].join('\n'),
				setupHeader: [
                    '#import <Foundation/Foundation.h>',
                    '@interface SimpleClass : NSObject {',
                        'NSString* name;',
                        'int age;',
                    '}',
                    '@property NSString* name;',
                    '@property int age;',
                    '- (void)printName;',
                    '@end'
				].join('\n'),
				code: [
                    'int main (int argc, const char * argv[]) {',
                        'NSAutoreleasePool * pool = [[NSAutoreleasePool alloc] init];',
                        'SimpleClass *simple = [[SimpleClass alloc] init];',
                        'simple.name = @"Codewars";',
                        'simple.age = 108;',
                        '[simple printName];',
                        '[simple release];',
                        '[pool drain];',
                    'return 0;',
                    '}'
				].join('\n')
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stdout).to.contain('Name: Codewars and the age is 108');
				done();
			});
		});
		it('should perform unit testing', function(done) {
			runner.run({
				language: 'objc',
				code: ' ',
				fixture: `
					@implementation TestSuite

					+ (void)testAClassMethod
					{
					   UKPass();
					}

					- (void)testIfPass
					{
					    UKPass();
					}

					@end
				`
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stdout).to.contain('<DESCRIBE::>TestSuite');
				expect(buffer.stdout).to.contain('<IT::>testAClassMethod');
				expect(buffer.stdout).to.contain('<IT::>testIfPass');
				expect(buffer.stdout).to.contain('<PASSED::>');
				expect(buffer.stdout).to.not.contain('<FAILED::>');
				expect(buffer.stdout).to.contain('<COMPLETEDIN::>');
				done();
			});
		});
		it('should perform unit testing and handling failures', function(done) {
			runner.run({
				language: 'objc',
				code: ' ',
				fixture: `
					@implementation TestSuite

					- (void) testsFailures
					{
					    UKFail();
					    UKTrue(NO);
					    UKFalse(YES);
					    UKNil(@"fwip");
					    UKNil(self);
					    UKNotNil(nil);
					    UKIntsEqual(3, 4);
					    UKIntsNotEqual(3, 3);
					    UKFloatsEqual(22.0, 33.0, 1.0);
					    UKFloatsNotEqual(22.1, 22.2, 0.2);
					    UKObjectsEqual(self, @"foo");
					    UKObjectsNotEqual(self, self);
					    UKObjectsSame(self, @"foo");
					    UKObjectsNotSame(@"foo", @"foo");
					    UKStringsEqual(@"fraggle", @"rock");
					    UKStringsNotEqual(@"fraggle", @"fraggle");
					    UKStringContains(@"fraggle", @"no");
					    UKStringDoesNotContain(@"fraggle", @"fra");
					}

					@end
				`
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stdout).to.contain('<DESCRIBE::>TestSuite');
				expect(buffer.stdout).to.contain('<IT::>testsFailures');
				expect(buffer.stdout).to.not.contain('<PASSED::>');
				expect(buffer.stdout).to.contain('<FAILED::>');
				expect(buffer.stdout).to.contain('<COMPLETEDIN::>');
				done();
			});
		});		
		it('should perform unit testing with code', function(done) {
			runner.run({
				language: 'objc',
				code: `
					#import <Foundation/Foundation.h>

					NSString* Foo (NSString *str){return str;}
				`,
				fixture: `
					@implementation TestSuite

					- (void) testsFoo
					{
						UKStringsEqual(@"Blah", Foo(@"Blah"));
						UKStringsNotEqual(@"fraggle", Foo(@"Blah"));
					}

					@end
				`
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stdout).to.contain('<DESCRIBE::>TestSuite');
				expect(buffer.stdout).to.contain('<IT::>testsFoo');
				expect(buffer.stdout).to.contain('<PASSED::>');
				expect(buffer.stdout).to.not.contain('<FAILED::>');
				expect(buffer.stdout).to.contain('<COMPLETEDIN::>');
				done();
			});
		});				
		it('should perform unit testing handling exceptions', function(done) {
			runner.run({
				language: 'objc',
				code: `
					#import <Foundation/Foundation.h>

					NSString* FooException (NSString *str){ 
						[NSException raise:@"FooException" format:@"Custom exception"]; 
						return str;
					}
				`,
				fixture: `
					@implementation TestSuite

					- (void) testsFooException
					{
						UKRaisesException(FooException(@"Blah"));
					}

					@end
				`
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stdout).to.contain('<DESCRIBE::>TestSuite');
				expect(buffer.stdout).to.contain('<IT::>testsFooException');
				expect(buffer.stdout).to.contain('<PASSED::>');
				expect(buffer.stdout).to.not.contain('<FAILED::>');
				expect(buffer.stdout).to.contain('<COMPLETEDIN::>');
				done();
			});
		});				
		it('should handle unhandled exceptions', function(done) {
			runner.run({
				language: 'objc',
				code: `
					#import <Foundation/Foundation.h>

					NSString* FooException (NSString *str){ 
						[NSException raise:@"FooException" format:@"Custom exception"]; 
						return str;
					}
				`,
				fixture: `
					@implementation TestSuite

					- (void) testsFooUnhandledException
					{
						UKStringsEqual(@"Blah", FooException(@"Blah"));
					}

					@end
				`
			}, function(buffer) {
				//console.log(buffer);
				expect(buffer.stdout).to.contain('<DESCRIBE::>TestSuite');
				expect(buffer.stdout).to.contain('<IT::>testsFooUnhandledException');
				expect(buffer.stdout).to.not.contain('<PASSED::>');
				expect(buffer.stdout).to.contain('<FAILED::>');
				expect(buffer.stdout).to.contain('NSException: FooException Custom exception');
				expect(buffer.stdout).to.contain('<COMPLETEDIN::>');
				done();
			});
		});		
        it('should handle functions from standard library <math.h>', function(done) {
           runner.run({
               language: 'objc',
               setup: false,
               code:[
                   '#import <Foundation/Foundation.h>',
                   '#include <math.h>',
                   'int main (int argc, const char * argv[]) {',
                     '@autoreleasepool{',
                       'NSLog(@"%.f", sqrt(pow(5, 2)) );',
                     '}',
                     'return 0;',
                   '}'
               ].join('\n')
            }, function(buffer) {
                //console.log(buffer);
                expect(buffer.stdout).to.contain('5');
                done();
            });
        });
        it('should support modern objc', function(done) {
           runner.run({
               language: 'objc',
               setup: false,
               code:`
					#import <Foundation/Foundation.h>

					NSNumber *ICKGetMaxProfit(NSArray<NSNumber *> *stockPricesYesterday, NSUInteger length) {
					    NSInteger minPrice, maxProfit;

					    NSCAssert1(length >= 2, 
					        @"parameter length: expected 2 or more but got %lu", (unsigned long)length);

					    minPrice = stockPricesYesterday[0].integerValue;
					    maxProfit = stockPricesYesterday[1].integerValue - stockPricesYesterday[0].integerValue;

					    for (NSUInteger i = 1; i < length; i++) {
					        NSInteger currentPrice = stockPricesYesterday[i].integerValue;
					        NSInteger potentialProfit = currentPrice - minPrice;

					        maxProfit = MAX(maxProfit, potentialProfit);
					        minPrice = MIN(minPrice, currentPrice);
					    }

					    return @(maxProfit);
					}


					int main (int argc, const char * argv[]) {
					    NSArray *stockPricesYesterday = @[ @15, @20, @19];
					    NSLog(@"%@", ICKGetMaxProfit(stockPricesYesterday,3));
					    return 0;
					}`
            }, function(buffer) {
                //console.log(buffer);
                expect(buffer.stdout).to.contain('5');
                done();
            });
        });
	    it('should get the return code', function(done) {
	        var solution = `
    			int main (int argc, const char * argv[]) {
              		return 10;
              	}
            `;
	        runner.run({
	            language: 'objc',
	            code: solution
	        }, function(buffer) {
	        	//console.log(buffer);
	            expect(buffer.exitCode).to.equal(10);
	            expect(buffer.exitSignal).to.equal(null);
	            done();
	        });
	    });
	    it('should catch signals on crash', function(done) {
	        var solution = `
	        	#import <Foundation/Foundation.h>
	        	int main (int argc, const char * argv[]) {	
	                  int *nullPointer = nil;
	                  *nullPointer = 0;
	            }
	        `;
	        runner.run({
	            language: 'objc',
	            code: solution
	        }, function(buffer) {
	        	//console.log(buffer);
	            expect(buffer.exitCode).to.equal(null);
	            expect(buffer.exitSignal).to.equal('SIGSEGV');
	            done();
	        });
	    });

	});
});
