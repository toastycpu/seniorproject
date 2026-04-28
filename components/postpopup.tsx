import React from 'react';
import { 
  View, Text, Image, ScrollView, Modal, Pressable, FlatList, 
  Dimensions, Platform, SafeAreaView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: windowWidth } = Dimensions.get('window');
const imageWidth = windowWidth - 40;

interface PostDetailModalProps {
  visible: boolean;
  post: any;
  onClose: () => void;
  auth: any;
  router: any;
  handleLike: (post: any) => void;
  handleSave: (post: any) => void;
  setViewerImages: (images: any[]) => void;
  setCurrentImageIndex: (index: number) => void;
  setIsViewerVisible: (visible: boolean) => void;
}

const getTimeRemaining = (expiresAt: any) => {
    if (!expiresAt || expiresAt === '' || expiresAt === 'none') return 'Permanent';
    
    let expirationDate;
    try {
        expirationDate = expiresAt.seconds 
            ? new Date(expiresAt.seconds * 1000) 
            : new Date(expiresAt);
            
        if (isNaN(expirationDate.getTime())) return 'Permanent';
    } catch (e) {
        return 'Permanent';
    }
        
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    const tenYearsInMs = 1000 * 60 * 60 * 24 * 365 * 10;
    
    if (diffMs > tenYearsInMs) return 'Permanent'; 
    if (diffMs <= 0) return 'Expired';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h left`;
    return `${diffHours}h left`;
};

const formatPostedDate = (dateVal: any) => {
    if (!dateVal) return '';
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const dateObj = new Date(dateVal);
    return !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : dateVal;
};

const PostDetailModal = ({
  visible,
  post: selectedPost,
  onClose,
  auth,
  router,
  handleLike,
  handleSave,
  setViewerImages,
  setCurrentImageIndex,
  setIsViewerVisible
}: PostDetailModalProps) => {

  if (!selectedPost) return null;

  const isSavedByCurrentUser = selectedPost.savedBy?.includes(auth.currentUser?.uid || '');
  const isLikedByCurrentUser = selectedPost.likedBy?.includes(auth.currentUser?.uid || '');
  
  const formattedImages = selectedPost.images?.length > 0 
    ? selectedPost.images.map((img: string) => ({ uri: img })) 
    : selectedPost.image ? [{ uri: selectedPost.image }] : [];

  const hasTime = selectedPost.startTime && selectedPost.endTime;
  const hasDays = Array.isArray(selectedPost.daysOpen) && selectedPost.daysOpen.length > 0;
  const isYardSaleEvent = hasTime || hasDays;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <Pressable 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} 
          onPress={onClose} 
        />

        <SafeAreaView style={{ maxHeight: '90%' }}>
          
          <Pressable 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ alignSelf: 'flex-end', marginBottom: 12 }}
            onPress={onClose}
          >
            <Ionicons name="close-circle" size={38} color="white" />
          </Pressable>

          <View style={[modalStyles.card, { 
            flexShrink: 1, 
            overflow: 'hidden',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <View style={modalStyles.cardHeader}>
                {selectedPost.authorAvatar ? (
                  <Image source={{ uri: selectedPost.authorAvatar }} style={modalStyles.avatar} />
                ) : (
                  <View style={[modalStyles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ccc' }]}>
                    <Ionicons name="person" size={20} color="white" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={modalStyles.spacebetween}>
                    <Text style={modalStyles.username}>{selectedPost.authorName || 'Anonymous User'}</Text>
                    <View style={modalStyles.timerBadge}>
                      <Ionicons name="time-outline" size={12} color="#1A3C40" />
                      <Text style={modalStyles.timerText}>{getTimeRemaining(selectedPost.expiresAt)}</Text>
                    </View>
                  </View>
                  <Text style={modalStyles.date}>{formatPostedDate(selectedPost.postedDate)}</Text>
                </View>
              </View>
              {selectedPost.images?.length > 0 ? (
                <FlatList 
                  data={selectedPost.images}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item: imgUri, index }) => (
                    <Pressable onPress={() => {
                      setViewerImages(formattedImages);
                      setCurrentImageIndex(index);
                      setIsViewerVisible(true);
                    }}>
                      <Image source={{ uri: imgUri }} style={[modalStyles.image, { width: imageWidth }]} />
                    </Pressable>
                  )}
                />
              ) : selectedPost.image ? (
                <Pressable onPress={() => {
                  setViewerImages(formattedImages);
                  setCurrentImageIndex(0);
                  setIsViewerVisible(true);
                }}>
                  <Image source={{ uri: selectedPost.image }} style={[modalStyles.image, { width: imageWidth }]} />
                </Pressable>
              ) : null}

              <View style={modalStyles.cardContent}>
                <Text style={[modalStyles.title, { marginBottom: 4, fontSize: 18, fontWeight: 'bold' }]}>
                  {selectedPost.title}
                </Text>
                
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A3C40' }}>
                    {selectedPost.isOwnPrice ? "Name your price" : selectedPost.price ? `$${selectedPost.price}` : ""}
                  </Text>
                </View>

                {isYardSaleEvent && (
                  <View style={{ backgroundColor: '#f4f6f6', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                    {hasDays && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: hasTime ? 6 : 0 }}>
                        <Ionicons name="calendar-outline" size={16} color="#1A3C40" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 14, color: '#1A3C40', fontWeight: 'bold' }}>
                          Days: <Text style={{ color: '#555', fontWeight: 'normal' }}>{selectedPost.daysOpen?.join(', ')}</Text>
                        </Text>
                      </View>
                    )}
                    {hasTime && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="time-outline" size={16} color="#1A3C40" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 14, color: '#1A3C40', fontWeight: 'bold' }}>
                          Time: <Text style={{ color: '#555', fontWeight: 'normal' }}>{selectedPost.startTime} - {selectedPost.endTime}</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {selectedPost.address && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Pressable
                      onPress={() => {
                        onClose();
                        router.push({
                          pathname: '/(tabs)/map',
                          params: { selectedId: selectedPost.id, lat: selectedPost.latitude?.toString(), lng: selectedPost.longitude?.toString() }
                        });
                      }}
                      style={{ paddingRight: 8, paddingVertical: 4 }}
                    >
                      <Ionicons name="navigate-circle" size={24} color="#1A3C40" />
                    </Pressable>
                    <Text style={[modalStyles.address, { marginBottom: 0, flex: 1, color: '#555' }]}>
                      {selectedPost.address}
                    </Text>
                  </View>
                )}

                <Text style={[modalStyles.description, { marginBottom: 16 }]}>
                  {selectedPost.description}
                </Text>

                <View style={modalStyles.actionRow}>
                  <Pressable style={modalStyles.actionButton} onPress={() => handleLike(selectedPost)}>
                    <Ionicons 
                      name={isLikedByCurrentUser ? "heart" : "heart-outline"} 
                      size={22} 
                      color={isLikedByCurrentUser ? "#e74c3c" : "#1A3C40"} 
                    />
                    <Text style={[modalStyles.actionText, isLikedByCurrentUser && { color: '#e74c3c', fontWeight: 'bold' }]}>
                      {selectedPost.likes || 0}
                    </Text>
                  </Pressable>

                  <Pressable onPress={() => {
                    onClose();
                    router.push(`/comments?postId=${selectedPost.id}`);
                  }} style={modalStyles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={20} color="#1A3C40" />
                    <Text style={modalStyles.actionText}>{selectedPost.commentsCount || 0}</Text>
                  </Pressable>

                  <Pressable style={modalStyles.actionButton} onPress={() => handleSave(selectedPost)}>
                    <Ionicons 
                      name={isSavedByCurrentUser ? "bookmark" : "bookmark-outline"} 
                      size={20} 
                      color={isSavedByCurrentUser ? "#1A3C40" : "#555"}
                    />
                    <Text style={[modalStyles.actionText, isSavedByCurrentUser && { color: '#1A3C40', fontWeight: 'bold' }]}>
                      {isSavedByCurrentUser ? "Saved" : "Save"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default PostDetailModal;

const modalStyles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#ddd",
        marginRight: 10,
    },
    username: {fontWeight: 'bold', fontSize: 14, color: 'black'},
    date: { fontSize: 12, color: "black"},
    image: {
        resizeMode: 'cover',
        height: 200,
        backgroundColor: '#a19f9f',
    },
    cardContent: {
        padding: 12,
    },
    spacebetween: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a2640'
    },
    address: {
        fontWeight: '400',
        fontSize: 16,
        color: 'black',
        marginBottom: 8,
        lineHeight: 20,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#555',
        fontWeight: '500'
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F1F2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    timerText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1A3C40',
        marginLeft: 4,
    },
});