//
//  TrolleysTableViewController.m
//  controlley
//
//  Created by Victor Ortiz on 8/19/17.
//  Copyright © 2017 va2ron1. All rights reserved.
//

#import "TrolleysTableViewController.h"
@import MapboxDirections;
@interface TrolleysTableViewController () {
	NSMutableArray *etas;
}

@end

@implementation TrolleysTableViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    // Uncomment the following line to preserve selection between presentations.
    // self.clearsSelectionOnViewWillAppear = NO;
    
    // Uncomment the following line to display an Edit button in the navigation bar for this view controller.
    // self.navigationItem.rightBarButtonItem = self.editButtonItem;
	
}

-(void)viewDidAppear:(BOOL)animated{
	[super viewDidAppear:animated];
	NSString *strJson = @"{\"route1\": [[18.400864730034726, -66.15406166670132],[18.396509559659663, -66.15530719976164]], \
	\"route2\": [[18.396509559659663, -66.15530719976164],[18.39683747308453, -66.15589475967067],[18.39724554225846, -66.15633624301692]], \
	\"route3\": [[18.39724554225846, -66.15633624301692],[18.39701030304194, -66.15738722030247],[18.397400344171132, -66.15795769189141]], \
	\"route4\": [[18.397400344171132, -66.15795769189141],[18.399214705104384, -66.15831744730986],[18.400291935115888, -66.15865308271502]], \
	\"route5\": [[18.400291935115888, -66.15865308271502],[18.40196609669826, -66.15906813294815],[18.40186066940894, -66.15747847306977]], \
	\"route6\": [[18.40186066940894, -66.15747847306977],[18.400533755802357, -66.15568237394433],[18.3997177236877, -66.15725243725633]], \
	\"route7\": [[18.3997177236877, -66.15725243725633],[18.399605170415114, -66.15833002578617],[18.39952757728851, -66.15912186800149]], \
	\"route8\": [[18.39952757728851, -66.15912186800149],[18.398293212289346, -66.16140052630766],[18.398154783206877, -66.16040502842304]], \
	\"route9\": [[18.398154783206877, -66.16040502842304],[18.39871373370775, -66.1585918830011]], \
	\"route10\": [[18.39871373370775, -66.1585918830011],[18.39908068526951, -66.15735951908549]], \
	\"route11\": [[18.39908068526951, -66.15735951908549],[18.399195476876756, -66.15660112752495]], \
	\"route12\": [[18.399195476876756, -66.15660112752495],[18.39945676420504, -66.1542362868965]], \
	\"route13\" :[[18.39945676420504, -66.1542362868965],[18.39937787792830, -66.1523046989196]], \
	\"route14\": [[18.39937787792830, -66.1523046989196],[18.397785483941874, -66.15009275733493]], \
	\"route15\": [[18.397785483941874, -66.15009275733493],[18.397386687157336, -66.14889422161004],[18.39777088330122, -66.14825030234826]], \
	\"route16\": [[18.39777088330122, -66.14825030234826],[18.398334466386984, -66.1446391537781],[18.396228522865854, -66.14554852852673]], \
	\"route17\": [[18.396228522865854, -66.14554852852673],[18.39820656810879, -66.14570401144123]], \
	\"route18\": [[18.39820656810879, -66.14570401144123],[18.4008934686712, -66.15000778503622]], \
	\"route19\": [[18.4008934686712, -66.15000778503622],[18.400382205073853, -66.15454229074436],[18.400664025916825, -66.15409378647888]], \
	\"route20\": [[18.400664025916825, -66.15409378647888],[18.400864730034726, -66.15406166670132]] }";
	
	NSData *data = [strJson dataUsingEncoding:NSUTF8StringEncoding];
	id jsonOutput = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
	[self getAllETAs:jsonOutput];
}

-(void)getAllETAs:(NSDictionary*)routes{
	etas = [[NSMutableArray alloc] init];
	NSArray *array;
	NSMutableArray<MBWaypoint *> *waypoints;
	
	for(int i = 0; i < 20; i++){
		array = [routes objectForKey:[NSString stringWithFormat:@"route%i",i+1]];
		waypoints = [[NSMutableArray alloc] init];
		for(NSArray *a in array){
			[waypoints addObject:[[MBWaypoint alloc] initWithCoordinate:CLLocationCoordinate2DMake([[a objectAtIndex:0] floatValue],[[a objectAtIndex:1] floatValue]) coordinateAccuracy:-1 name:@"Point"]];
		}
		[self getETAByCoordinates:waypoints];
	}
}

-(void)getETAByCoordinates:(NSArray*)waypoints{
	MBRouteOptions *options = [[MBRouteOptions alloc] initWithWaypoints:waypoints
													  profileIdentifier:MBDirectionsProfileIdentifierAutomobileAvoidingTraffic];
	options.includesSteps = YES;
	MBDirections *directions = [[MBDirections alloc] initWithAccessToken:@"pk.eyJ1IjoidmEycm9uMSIsImEiOiJjaXUxamJtdTYwYm5wMm9xdGphenNzNG1rIn0.TkfC4X1IMO60kPDC1J4IAg"];
	
	[directions calculateDirectionsWithOptions:options
							 completionHandler:^(NSArray<MBWaypoint *> * _Nullable waypoints,
												 NSArray<MBRoute *> * _Nullable routes,
												 NSError * _Nullable error) {
								 if (error) {
									 NSLog(@"Error calculating directions: %@", error);
									 return;
								 }
								 
								 MBRoute *route = routes.firstObject;
								 MBRouteLeg *leg = route.legs.firstObject;
								 if (leg) {
									 //NSLog(@"Route via %@:", leg);
									 
									 
									 // NSLog(@"Distance: %@; ETA: %@", formattedDistance, formattedTravelTime);
									 int station = (int)[etas count]+2;
									 if(station == 21){
										 station = 1;
									 }
									 
									 float prev = 0.f;
									 if([etas count] > 0){
										 prev = [[[etas objectAtIndex:[etas count]-1] objectForKey:@"eta"] floatValue];
									 }
									 
									 [etas addObject:@{@"station":[NSNumber numberWithInt:station],@"eta":[NSNumber numberWithFloat:route.expectedTravelTime+prev]}];
									 
									 if([etas count] == 20){
										 /*for(NSDictionary *d in etas){
											 NSLog(@"Station: %@ ETA: %@", [d objectForKey:@"station"],[travelTimeFormatter stringFromTimeInterval:[[d objectForKey:@"eta"] floatValue]]);
										 }*/
										 [self.tableView reloadData];
									 }
									 
								 }
								 /* if (route.coordinateCount) {
								  // Convert the route’s coordinates into a polyline.
								  CLLocationCoordinate2D *routeCoordinates = malloc(route.coordinateCount * sizeof(CLLocationCoordinate2D));
								  [route getCoordinates:routeCoordinates];
								  MGLPolyline *routeLine = [MGLPolyline polylineWithCoordinates:routeCoordinates count:route.coordinateCount];
								  
								  // Add the polyline to the map and fit the viewport to the polyline.
								  [self.mapView addAnnotation:routeLine];
								  [self.mapView setVisibleCoordinates:routeCoordinates count:route.coordinateCount edgePadding:UIEdgeInsetsZero animated:YES];
								  
								  // Make sure to free this array to avoid leaking memory.
								  free(routeCoordinates);
								  }*/
							 }];
}


- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma mark - Table view data source

- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView {
    return 1;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    return [etas count];
}


- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"trolleys" forIndexPath:indexPath];
    
    if(cell == nil)
		cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle reuseIdentifier:@"trolleys"];
		
	[cell.imageView setImage:[UIImage imageNamed:@"trolley"]];
	cell.textLabel.text = [NSString stringWithFormat:@"Station: %@",[[etas objectAtIndex:indexPath.row] objectForKey:@"station"]];
	
	NSDateComponentsFormatter *travelTimeFormatter = [[NSDateComponentsFormatter alloc] init];
	travelTimeFormatter.unitsStyle = NSDateComponentsFormatterUnitsStyleShort;
	
	cell.detailTextLabel.text = [NSString stringWithFormat:@"ETA: %@",[travelTimeFormatter stringFromTimeInterval:[[[etas objectAtIndex:indexPath.row] objectForKey:@"eta"] floatValue]]];
	
		
    return cell;
}


/*
// Override to support conditional editing of the table view.
- (BOOL)tableView:(UITableView *)tableView canEditRowAtIndexPath:(NSIndexPath *)indexPath {
    // Return NO if you do not want the specified item to be editable.
    return YES;
}
*/

/*
// Override to support editing the table view.
- (void)tableView:(UITableView *)tableView commitEditingStyle:(UITableViewCellEditingStyle)editingStyle forRowAtIndexPath:(NSIndexPath *)indexPath {
    if (editingStyle == UITableViewCellEditingStyleDelete) {
        // Delete the row from the data source
        [tableView deleteRowsAtIndexPaths:@[indexPath] withRowAnimation:UITableViewRowAnimationFade];
    } else if (editingStyle == UITableViewCellEditingStyleInsert) {
        // Create a new instance of the appropriate class, insert it into the array, and add a new row to the table view
    }   
}
*/

/*
// Override to support rearranging the table view.
- (void)tableView:(UITableView *)tableView moveRowAtIndexPath:(NSIndexPath *)fromIndexPath toIndexPath:(NSIndexPath *)toIndexPath {
}
*/

/*
// Override to support conditional rearranging of the table view.
- (BOOL)tableView:(UITableView *)tableView canMoveRowAtIndexPath:(NSIndexPath *)indexPath {
    // Return NO if you do not want the item to be re-orderable.
    return YES;
}
*/

/*
#pragma mark - Navigation

// In a storyboard-based application, you will often want to do a little preparation before navigation
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    // Get the new view controller using [segue destinationViewController].
    // Pass the selected object to the new view controller.
}
*/

@end
