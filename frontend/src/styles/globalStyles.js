import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#1ADDDB',
  background: '#030A24',
  white: '#FFFFFF',
  text: '#FFFFFF',
  accent: '#1ADDDB',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 5,
    textAlign: 'left',
    fontWeight: '500',
  },
  subTitleText: {
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  modernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginVertical: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.5)',
  },
  FQText: {
    fontSize: 15,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 10,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29,43,95,0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginHorizontal: 5,
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
}); 